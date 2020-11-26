var loId;
var isSubmitClicked = false;
var activityResponse = {};
const buttonClasses = {
    submit: '.submit-lo-button',
    tryAgain: '.try-again-button',
    showAnswers: '.show-answer-button',
    hideAnswers: '.hide-answers-button'
};
const statements = {
    started: 'started',
    launched: 'launched',
    scored: 'scored'
}

const scoreStatus = {
    correct: 'correct',
    incorrect: 'incorrect',
    partiallyCorrect: 'partiallyCorrect'
}

function initChannel() {
    return new Promise((resolve, reject) => {
        channel = Channel.build({
            window: window.parent,
            origin: '*',
            scope: 'cup-default',
            onReady: function () {
                resolve(channel);
            }
        });
    });
}

/* Function called when the activity is destroyed, it notifies the container once LO is properly closed and cleaning operations performed, if any */
var closeConnections = function () {

    channel.notify({
        method: 'sendMessageToContainer',
        params: {
            type: 'terminated'
        }
    });
};

/* Function called on launch of Activity, to notify container with the ready event when the LO is loaded and ready for interaction */
var DOMReady = function () {
    channel.notify({
        method: 'sendMessageToContainer',
        params: {
            type: 'ready'
        }
    });
};

/* Function to bind methods with the created jschannel instance.  */
var bindChannel = function (channel) {
    channel.bind('receiveMessageFromContainer', function (trans, params) {
        if (params.type === 'checkAnswers') {
            $.find(buttonClasses.submit)[0].click();
        } else if (params.type === 'tryAgain') {
            $.find(buttonClasses.tryAgain)[0].click();
        } else if (params.type == 'showCorrectAnswers') {
            $.find(buttonClasses.showAnswers)[0].click();
            showAnswer();
        } else if (params.type == 'showUserResponse') {
            $.find(buttonClasses.hideAnswers)[0].click();
            userResponse();
        } else if (params.type === 'sendScores') {
            sendScores();
        } else if (params.type === 'close') {
            closeConnections();
        } else if (params.type === 'currentScreen') {
            return 1;
        } else if (params.type === 'totalScreens') {
            return 1;
        } else if (params.hasOwnProperty('type')) {
            throw { error: "method_not_found", message: 'method not found' };
        } else {
            throw { error: "invalid_request_structure", message: 'invalid request structure' };
        }
    });
};

/* Function to get initialization paramters from the container */
function getInitParameters() {
    return new Promise((resolve, reject) => {
        channel.call({
            method: 'sendMessageToContainer',
            params: {
                type: 'init'
            },
            success: function (params) {
                resolve(params);
            }
        });
    })
}

/* Function to generate statement - started/launched/scored etc.*/
var generateStatement = function (verb, payload) {
    var statement = {
        verb: {
            "id": "http://adlnet.gov/expapi/verbs/" + verb,
            "display": {
                "und": verb
            }
        },
        object: {
            "id": loId
        }
    };
    if (verb === statements.scored) {
        statement.result = {
            score: payload
        }
    }
    var statementsArray = [];
    statementsArray.push(statement);
    channel.call({
        method: 'sendMessageToContainer',
        params: {
            type: 'newStatements',
            data: statementsArray
        },
        success: function () { },
        error: function () {
            console.log('newStatements method error');
        }
    });
};

/* Function called by the LO to pass controls change data to the container */
var changeControlsVisibility = function (control, visible, buttonText) {
    var params = {
        type: 'controlsChange',
        data: {
            control: control,
            meta: {
                buttonText: buttonText,
                type: 'button'
            },
            visible: visible
        }
    };
    channel.call({
        method: 'sendMessageToContainer',
        params: params,
        success: function () { },
        error: function () {
            console.log('controlsChange method error');
        }
    });
};

/**
     * Function invoked to show the result screen in the container
     * @param {*} score
     */
var showResult = function (score) {
    var params = {
        type: 'showResult',
        data: {
            score: score,
            review: false
        }
    };
    channel.call({
        method: 'sendMessageToContainer',
        params: params,
        success: function () { },
        error: function () {
            console.log('showResult method error');
        }
    });
};

var updateFeedbackStatus = function (visibility) {
    var params = {
        type: "feedbackChange",
        data: {
            feedback: activityResponse.status,
            visible: visibility
        }
    };
    channel.call({
        method: 'sendMessageToContainer',
        params: params,
        success: function () { },
        error: function () {
            console.log("feedbackChange control error");
        }
    })
};

var checkAnswerCallback = (resultArray) => {
    let activityScoreObj = {
        min: 0,
        max: resultArray.length,
        raw: 0,
        scaled: 0
    }
    resultArray.forEach((res) => {
        activityScoreObj.raw += (res.points / res.pointsToGain);
    });
    activityScoreObj.scaled = activityScoreObj.raw / activityScoreObj.max;
    activityResponse.score = activityScoreObj;

    activityResponse.status = scoreStatus.partiallyCorrect;
    if (activityScoreObj.scaled == 0) {
        activityResponse.status = scoreStatus.incorrect;
    } else if (activityScoreObj.scaled == 1) {
        activityResponse.status = scoreStatus.correct;
    }

    if (isSubmitClicked) {
        submit();
    } else {
        checkAnswerVisibility(false);
        tryAgainVisibility(true);
        updateFeedbackStatus(true);
        if (activityResponse.status != scoreStatus.correct) {
            showCorrectAnswerVisibility(true);
        }
    }
};

var sendScores = () => {
    isSubmitClicked = true;
    if (activityResponse.score) {
        submit();
    } else {
        $.find(buttonClasses.submit)[0].click();
    }
}

var submit = () => {
    generateStatement(statements.scored, JSON.parse(JSON.stringify(activityResponse.score)));
    showResult(activityResponse.score.scaled);
}

var tryAgainCallback = () => {
    tryAgainVisibility(false);
    checkAnswerVisibility(true);
    updateFeedbackStatus(false);
    activityResponse = {};
}

var showAnswer = () => {
    showUserResponseVisibility(true);
    showCorrectAnswerVisibility(false);
}

var userResponse = () => {
    showUserResponseVisibility(false);
    showCorrectAnswerVisibility(true);
};

var checkAnswerVisibility = (visibility) => {
    changeControlsVisibility('checkAnswers', visibility, 'Check Answer');
};

var showCorrectAnswerVisibility = (visibility) => {
    changeControlsVisibility('showCorrectAnswers', visibility, 'Show Answer');
};

var showUserResponseVisibility = (visibility) => {
    changeControlsVisibility('showUserResponse', visibility, 'Your Response');
};

var tryAgainVisibility = (visibility) => {
    changeControlsVisibility('tryAgain', visibility, "Try Again");
};

var previousButtonVisiblity = (visibility) => {
    changeControlsVisibility('goPrev', visibility, "Previous");
};

var nextButtonVisibility = (visibility) => {
    changeControlsVisibility('goNext', visibility, "Next");
};

document.addEventListener('DOMContentLoaded', function () {
    initChannel()
        .then(channel => {
            bindChannel(channel);
            return getInitParameters()
                .then(initParams => {
                    loId = initParams.id;
                    generateStatement(statements.started);
                    generateStatement(statements.launched);
                    DOMReady();
                    checkAnswerVisibility(true);
                    previousButtonVisiblity(false);
                    nextButtonVisibility(false);
                })
        });
})