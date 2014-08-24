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
            mode = MODE.CHAN;
            break;
        case MODE.BRI:
            mode = MODE.VOL;
            break;
        case MODE.CHAN:
            mode = MODE.BRI;
            break;
    }
    setStatus(mode + ': ' + getParam(mode));
}

function modeDown() {
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
    setStatus(mode + ': ' + getParam(mode));
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

function startShutdownTimer() {
    shutdownTimeoutId = setTimeout(function() {
        state = STATE.SHUTDOWN_PROMPT;
        display("Are you sure you want to shut down?");
        setHelpText('(You can release both keys now.)<br>Press Ctrl to shutdown, or Shift to cancel.');
        displayState({});
    }, 800);
}

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

function display(text) {
    $('#display').text(text);
}

function setHelpText(text) {
    $('#help-text').html(text);
}

function setStatus(text) {
    $('#status').text(text);
}

function someKeyWasDown() {
    return (prev.j == KEYSTATE.DOWN || prev.k == KEYSTATE.DOWN);
}

function exactlyOneKeyWasDown() {
    return ((prev.j == KEYSTATE.DOWN && prev.k == KEYSTATE.UP) || (prev.j == KEYSTATE.UP && prev.k == KEYSTATE.DOWN));
}

// retrieves the volume/brightness/channel value
function getParam(mode) {
    switch (mode) {
        case MODE.VOL:
            return volume;
            break;
        case MODE.BRI:
            return brightness;
            break;
        case MODE.CHAN:
            return channel;
            break;
        default:
            alert("unrecognized mode in setParam");
    }
}

// changes the volume/brightness/channel value
function setParam(mode, now) {
    var delta;
    if (now.key == 'j') {
        delta = -1;
    } else if (now.key == 'k') {
        delta = 1;
    } else {
        alert("setParam was called with some unrecognized key.");
    }
    switch (mode) {
        case MODE.VOL:
            volumeUp(delta);
            setStatus(MODE.VOL + ': ' + volume);
            break;
        case MODE.BRI:
            brightnessUp(delta);
            setStatus(MODE.BRI + ': ' + brightness);
            break;
        case MODE.CHAN:
            channelUp(delta);
            setStatus(MODE.CHAN + ': ' + channel);
            break;
        default:
            alert("unrecognized mode in setParam");
    }
}

// The state transition function. Modifies the state too.
function transition(now) {
    switch (state) {
        case STATE.OFF:
            if (someKeyWasDown()) {
                if (exactlyOneKeyWasDown()) {
                    if (now.action == KEYSTATE.UP) { // user came from SHUTDOWN_PROMPT, and now released a button.
                        if (now.key == 'j') {
                            display("Shutting down now.");
                            setHelpText('');
                            setStatus('');
                            setTimeout(function() {
                                display("(TV off)");
                                setHelpText("Press Ctrl or Shift to turn TV on.");
                                setStatus('');
                            }, 1000);
                        } else if (now.key == 'k') {
                            display("Shutdown cancelled.");
                            setTimeout(function() {
                                display("(TV on)");
                                state = STATE.IDLE;
                            }, 1000);
                        }
                    } else {
                        // another key is now pressed down
                        // we stay and wait for user to release both.
                    }
                } else {
                    // both keys were down
                    // we stay and wait for user to release both.
                }
            } else { // no keys were down
                if (now.action == KEYSTATE.DOWN) {
                    state = STATE.IDLE;
                }
            }
            break;
        case STATE.IDLE:
            if (someKeyWasDown()) {
                if (now.action == KEYSTATE.UP) {
                    display('(TV on)');
                    setStatus(mode + ': ' + getParam(mode));
                } else if (now.action == KEYSTATE.DOWN) {
                    state = STATE.CHANGING_MODE;
                    startShutdownTimer();
                }
            } else { // no keys were down
                if (now.action == KEYSTATE.DOWN) {
                    state = STATE.CHANGING_PARAM;
                }
            }
            break;
        case STATE.CHANGING_PARAM:
            if (exactlyOneKeyWasDown() && now.action == KEYSTATE.UP) {
                setParam(mode, now);
                // TODO: set timeout for returning to VOL mode.
                state = STATE.IDLE;
            } else if (someKeyWasDown() && now.action == KEYSTATE.DOWN) {
                state = STATE.CHANGING_MODE;
                startShutdownTimer();
            }
            break;
        case STATE.CHANGING_MODE:
            if (someKeyWasDown()) {
                if (exactlyOneKeyWasDown()) {
                    if (now.action == KEYSTATE.UP) {
                        state = STATE.IDLE;
                    } else {
                        // stay in this state and wait for the user to release this button to switch modes.
                        startShutdownTimer();
                    }
                } else { // both keys were down
                    if (now.action == KEYSTATE.UP) { // should always be true
                        if (now.key == 'j') {
                            modeDown();
                        } else if (now.key == 'k') {
                            modeUp();
                        }
                        clearTimeout(shutdownTimeoutId);
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
    switch (state) {
        case STATE.IDLE:
            setHelpText('To increase or decrease the current parameter (' + mode + '), press Shift or Ctrl.<br>To change another parameter, hold one key and press the other to cycle through parameters.<br>To shutdown, hold down both keys.');
            break;
        case STATE.CHANGING_MODE:
            setHelpText('Release the key to confirm selection.<br>To shutdown, hold down the other key.');
    }
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
setHelpText('Press Ctrl or Shift to turn TV on.');