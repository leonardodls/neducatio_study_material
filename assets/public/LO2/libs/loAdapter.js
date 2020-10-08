var loId;
const containerId = '#container';
function updateCss() {
    let wrapper = $.find('#wrapper')[0];
    wrapper.style.overflow = 'hidden';
}

function initChannel() {
    return new Promise((resolve, reject) => {
        channel = Channel.build({
            window: window.parent,
            origin: '*',
            scope: 'cup-generic-default',
            onReady: function () {
                resolve(channel);
            }
        });
    });
}

/* Function to generate statement - started/launched/scored etc.*/
var generateStatement = function (verb) {
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
        if (params.type === 'close') {
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

/* Function called by the LO to pass dimensions change data to the container */
var newDimensions = function (dimensions) {
    channel.call({
        method: 'sendMessageToContainer',
        params: {
            type: 'size',
            data: {
                size: dimensions
            }
        },
        success: function () { },
        error: function () {
            console.log('size method error');
        }
    });
};

function debounce(func, delay){
    let debounceTimer;
    return function () {
        const context = this
        const args = arguments
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => func.apply(context, args), delay)
    }
}

function sendSizeEvent() {
    let container = $.find(containerId)[0];
    newDimensions({
        height: container.clientHeight,
        width: container.clientWidth
    });
}

function registerContainerResizeEvent() {
    let container = $.find(containerId)[0];
    let debounceEvent = debounce(sendSizeEvent, 50);
    new ResizeObserver(debounceEvent).observe(container);
}

document.addEventListener('DOMContentLoaded', function () {
    initChannel()
        .then(channel => {
            bindChannel(channel);
            return getInitParameters()
                .then(initParams => {
                    loId = initParams.id;
                    generateStatement('launched');
                    DOMReady();
                    updateCss();
                    sendSizeEvent();
                    registerContainerResizeEvent();
                })
        });
});