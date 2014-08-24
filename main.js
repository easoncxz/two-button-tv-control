function display(text) {
    $('#display').html(text);
}

var volume = 5;

function volumeUp(delta) {
    volume += delta;
    if (volume > 9) {
        volume = 9;
    }
    if (volume < 0) {
        volume = 0;
    }
}

var brightness = 5;

function brightnessUp(delta) {
    brightness += delta;
    if (brightness > 9) {
        brightness = 9;
    }
    if (brightness < 0) {
        brightness = 0;
    }
}

var channel = 1;

function channelUp(delta) {
    channel = (channel + delta) % 5; // there are only 5 channels
    if (channel < 0) {
        channel += 5;
    }
}

// think enum
var MODE = {
    VOL: "volume",
    BRI: "brightness",
    CHAN: "channel",
    MODE: "mode"
}

var mode = MODE.VOL; // when the user turns on the TV, TV waits for volumn control first.

function modeUp() {
    switch (mode) {
        case MODE.VOL:
            mode = MODE.BRI;
            break;
        case MODE.BRI:
            mode = MODE.CHAN;
            break;
        case MODE.CHAN:
            mode = MODE.VOL;
            break;
    }
}

function modeDown() {
    switch (mode) {
        case MODE.VOL:
            mode = MODE.CHAN;
            break;
        case MODE.BRI:
            mode = MODE.VOL;
            break;
        case MODE.CHAN:
            mode = MODE.BRI;
            break;
    }
}

var KEYSTATE = {
    UP: 'UP',
    DOWN: 'DOWN'
}

var STATE = {
    OFF: "OFF",
    IDLE: "IDLE",
    CHANGING_PARAM: "CHANGING_PARAM",
    CHANGING_MODE: "CHANGING_MODE",
    SHUTDOWN_PROMPT: "SHUTDOWN_PROMPT",
}

var state = STATE.OFF; // think state machine

var prev = {
    'j': KEYSTATE.UP,
    'k': KEYSTATE.UP
}; // records some "previous" button state.

var shutdownTimeoutId;

function displayState(now) {
    $('#state-displayer .state .value').text(state);
    $('#state-displayer .mode .value').text(mode);
    $('#state-displayer .volume .value').text(volume);
    $('#state-displayer .brightness .value').text(brightness);
    $('#state-displayer .channel .value').text(channel);
    $('#state-displayer .now  .j .value').text(now.key == 'j' ? now.action : prev.j);
    $('#state-displayer .now  .k .value').text(now.key == 'k' ? now.action : prev.k);
    $('#state-displayer .prev .j .value').text(prev.j);
    $('#state-displayer .prev .k .value').text(prev.k);
}

function someKeyWasDown() {
    return (prev.j == KEYSTATE.DOWN || prev.k == KEYSTATE.DOWN);
}

function exactlyOneKeyWasDown() {
    return ((prev.j == KEYSTATE.DOWN && prev.k == KEYSTATE.UP) || (prev.j == KEYSTATE.UP && prev.k == KEYSTATE.DOWN));
}

function modifyParam(mode, now) {
    console.log("modifying param");
    var delta;
    if (now.key == 'j') {
        delta = -1;
    } else if (now.key == 'k') {
        delta = 1;
    } else {
        alert("modifyParam was called with some unrecognized key.");
    }
    switch (mode) {
        case MODE.VOL:
            volumeUp(delta);
            break;
        case MODE.BRI:
            brightnessUp(delta);
            break;
        case MODE.CHAN:
            channelUp(delta);
            break;
        default:
            alert("unrecognized mode in modifyParam");
    }
}

// The state transition function. Modifies the state too.
function transition(now) {
    switch (state) {
        case STATE.OFF:
            if (someKeyWasDown()) { // user came from SHUTDOWN_PROMPT, and now released a button.
                if (exactlyOneKeyWasDown() && now.key == 'j') {
                    display("Shutting down now.");
                    setTimeout(function() {
                        display("TV off");
                    }, 1000);
                } else if (now.key == 'j') {
                    display("Shutdown cancelled.");
                    setTimeout(function() {
                        display("TV on");
                        state = STATE.IDLE;
                    }, 1000);
                }
            } else { // no keys were down
                if (now.action == KEYSTATE.DOWN) {
                    state = STATE.IDLE;
                }
            }
            break;
        case STATE.IDLE:
            if (someKeyWasDown()) {
                // do nothing
            } else { // no keys were down
                if (now.action == KEYSTATE.DOWN) {
                    state = STATE.CHANGING_PARAM;
                }
            }
            break;
        case STATE.CHANGING_PARAM:
            if (exactlyOneKeyWasDown() && now.action == KEYSTATE.UP) {
                modifyParam(mode, now);
                // TODO: set timeout for returning to VOL mode.
                state = STATE.IDLE;
            } else if (someKeyWasDown() && now.action == KEYSTATE.DOWN) {
                state = STATE.CHANGING_MODE;
            }
            break;
        case STATE.CHANGING_MODE:
            if (someKeyWasDown()) {
                if (exactlyOneKeyWasDown()) {
                    if (now.action == KEYSTATE.UP) {
                        state = STATE.IDLE;
                    } else if (now.action == KEYSTATE.DOWN) { // the other key is down too
                        // set timeout for shutdown prompt.
                        // shutdownTimeoutId = setTimeout(function() {
                        //     mode = MODE.SHUTDOWN_PROMPT;
                        //     display("Are you sure you want to shut down? Press J to shutdown, and K to cancel.");
                        // }, 800);
                    } else {
                        alert("unrecognized button action in transition > CHANGING_MODE.");
                    }
                } else { // both keys were down
                    if (now.action == KEYSTATE.UP) { // should always be true
                        if (now.key == 'j') {
                            modeDown();
                        } else if (now.key == 'k') {
                            modeUp();
                        }
                        // cleatTimeout(shutdownTimeoutId);
                        state = STATE.CHANGING_PARAM;
                    } else {
                        alert("transition > CHANGING_MODE cannot understand how you can press another button down while both are already down.");
                    }
                }
            } else { // no keys were down
                alert("Mode changing is so broken.");
            }
            break;
        case STATE.SHUTDOWN_PROMPT:
            if (!someKeyWasDown()) { // no key was down.
                if (now.action == KEYSTATE.DOWN) {
                    state = STATE.OFF; // TV really only turns off when in the OFF state, the user lifts his finger off j.
                }
            }
            break;
        default:
            alert("WTH is this state?");
    }
    displayState(now);
    prev[now.key] = now.action;
}

//
// ------------------------------------------------------------
//

$(window).keydown(function(e) {
    console.log(e);
    if (e.keyCode == 17) {
        transition({
            key: 'j',
            action: KEYSTATE.DOWN
        });
    } else if (e.keyCode == 16) {
        transition({
            key: 'k',
            action: KEYSTATE.DOWN
        });
    }
});
$(window).keyup(function(e) {
    console.log(e);
    if (e.keyCode == 17) {
        transition({
            key: 'j',
            action: KEYSTATE.UP
        });
    } else if (e.keyCode == 16) {
        transition({
            key: 'k',
            action: KEYSTATE.UP
        });
    }
});
