
//-------------------------INIT PART-----------------------------------------------------
$(document).ready(function () {
    Cogwheel.setCogWheelElement($('#cogwheel-modal'))
        .setCogWheelDescElement($('#cogwheel-desc'))
        .setText('Init started')
        .show();

    Cogwheel.setText('Loading trainer settings');

    BreadCrumb.setBreadCrumbElement($('.bc-steps'));
    ProgressBar.setProgressBarElement($('div.trainer-progress-bar div'));

    var init = function () {
        var config = Service.getTrainerConfig();

        if (PRODUCTION === true) {
            Logger.production();
        } else {
            $.ajaxSetup({cache: false});
            Logger.debugging();
        }
        Cogwheel.setText('Setting up step rotator');
        Rotator.setStepSpace($('section.stepspace'));
        Rotator.setNextButton($('#nextController'))
            .setPrevButton($('#prevController'))
            .enableNextButton();

        Cogwheel.setText('Setting up i18n');
        I18N.setAvailableLanguages(config['LANGUAGES']);
        var langParam = Service.getUrlParam('lang');
        if (langParam != '')
            I18N.setLanguage(langParam);
        else
            I18N.setLanguage(config['DEFAULT_LANG']);

        $('#aboutBody').html(Service.about()).append("</br><strong>Current trainer author: </strong>" + (config['TRAINER_AUTHOR'] ? config['TRAINER_AUTHOR'] : 'Unknown') + "</br><strong>Course author: </strong>" + (config['COURSE_AUTHOR'] ? config['COURSE_AUTHOR'] : 'Unknown'));

        Cogwheel.setText('Loading language file');
        I18N.loadLanguage(function () {
            Cogwheel.setText('Reading language file');
            Templatetor.extendConstView(I18N.getConstants());
            Templatetor.extendConstView({TRAINER_SCORE: config['TRAINER_SCORE']});
            Scorer.setTotalScore(config['TRAINER_SCORE']);
            var Tpl = new Templatetor();
            Tpl.replace(true).setTemplate($('html')).render();
            Cogwheel.setText('Starting trainer');
            Rotator.init(function () {
                Scorer.start();
                Cogwheel.setText('Notifying server');
                if (!PRODUCTION)
                    Cogwheel.hide();
                else {
                    Service.notifyServer(function () {
                        Cogwheel.hide();
                    })
                }
            });
        });
    };
    Service.loadConfig(
        function () {
            var config = Service.getTrainerConfig();
            window.PRODUCTION = config['PRODUCTION'];

            PRODUCTION ? Service.fetchStorageInfo(init) : init();
        });
});


//---------------------------------LOGGER PART-----------------------------------------------------
/**
 * Logger class is a simple extension to make logging and debugging
 * in Chrome easier and more eye-catching.
 * @constructor
 */
function Logger() {
    var _debug = 0;
    var _info = 1;
    var _error = 2;
    var _catching = 4;

    /**
     * Gets logger's caller from error stack
     * @returns {String} caller file and call pos
     */
    var getCaller = function () {
        var stack = (new Error).stack.match(/^(?!.*Logger).*$/gm);
        return stack[1].replace(/^\s+|\s+$/g, '');
    };

    /**
     * This method perform logging objects depending on message type.
     * All log messages are grouped into console.group
     * @param args {*} Objects to log
     * @param type {number} a type of log message
     */
    var consoleLog = function (args, type) {
        var logger;
        if (type == _debug) {
            logger = function (o) {
                console.log('%c ' + o, 'color: #4387fd')
            };
            grouper = function (s) {
                console.group('%c [DEBUG] [' + s + ']', 'color: #4387fd');
            }
        } else if (type == _info) {
            logger = function (o) {
                console.log('%c ' + o, 'color: #D4BB02')
            };
            grouper = function (s) {
                console.group('%c [INFO] [' + s + ']', 'color: #D4BB02');
            }
        } else if (type == _error) {
            logger = function (o) {
                console.error(o)
            };
            grouper = function (s) {
                console.group('%c [ERROR] [' + s + ']', 'color: #FF0000');
            }
        } else if (type == _catching) {
            logger = function (o) {
                console.log('%c ' + o, 'color: #FC1CEA')
            };
            grouper = function (s) {
                console.group('%c [CATCHING] [' + s + ']', 'color: #FC1CEA');
            }
        } else {
            logger = function (o) {
                console.log(o)
            };
        }

        //grouper(getCaller());
        for (var i = 0; i < args.length; i++) {
            if (typeof args[i] === "object") {
                console.log(args[i]);
            } else {
                logger(args[i]);
            }
        }
        console.groupEnd();
    };

    /**
     * Displays blue colored message
     * @param {*} {*} any amount of object to debug
     */
    this.debug = function () {
        if (Logger.level === 0)
            consoleLog(arguments, _debug);
    };

    /**
     * Displays mustard colored message
     * @param {*} {*} any amount of object to info
     */
    this.info = function () {
        if (Logger.level <= 1)
            consoleLog(arguments, _info);
    };

    /**
     * Displays pink colored message
     * @param {*} {*} any amount of object to catch
     */
    this.catching = function () {
        if (Logger.level <= 2)
            consoleLog(arguments, _catching);
    };

    /**
     * Displays red colored message
     * @param {*} any amount of object to show as error
     */
    this.error = function () {
        if (Logger.level <= 2)
            consoleLog(arguments, _error);
    };
}
Logger.level = 0;

Logger.debugging = function () {
    Logger.level = 0
};
Logger.informer = function () {
    Logger.level = 1;
};
Logger.production = function () {
    Logger.level = 2;
};
Logger.silent = function () {
    Logger.level = 3;
};


//---------------------------------TEMPLATETOR PART-----------------------------------------------------
var Templatetor = null;

(function ($, _Mustache, _Logger) {
    /**
     * Templatetor is a Mustache wrapper with some addition functionality
     * like replacing mustache placeholders in already rendered DOM elements
     * and checking for them in the string. Also it has a container of static
     * view values, that makes language templating easier.
     * @constructor
     */
    Templatetor =
        function () {
            var LOGGER = new _Logger();

            var view = {};
            var template = null;

            var replaceMode = false;

            /**
             * Replace text in specified elements. Note that only text content will be
             * modified, leaving all tags and attributes untouched. The new text can be
             * either text or HTML.
             * @author "Cowboy" Ben Alman http://benalman.com/projects/jquery-replacetext-plugin/
             * @param search (RegExp|String) A RegExp object or substring to be replaced.
             * @param replace (String|Function) The String that replaces the substring received
             *                 from the search argument, or a function to be invoked to create the new substring.
             * @param text_only (Boolean) If true, any HTML will be rendered as text. Defaults to false.
             * @returns {jQuery} The initial jQuery collection of elements.
             */
            $.fn.replaceText = function (search, replace, text_only) {
                return this.each(function () {
                    var node = this.firstChild,
                        val,
                        new_val,
                        remove = [];
                    if (node) {
                        do {
                            if (node.nodeType === 3) {
                                val = node.nodeValue;
                                new_val = val.replace(search, replace);
                                if (new_val !== val) {
                                    if (!text_only && /</.test(new_val)) {
                                        $(node).before(new_val);
                                        remove.push(node);
                                    } else {
                                        node.nodeValue = new_val;
                                    }
                                }
                            }
                        } while (node = node.nextSibling);
                    }
                    remove.length && $(remove).remove();
                });
            };

            /**
             * Adds values to templatetor's view.
             * View is a assoc array for replacement using Mustache
             * @param o {Object} view to add
             * @returns {Templatetor} current object (flow)
             */
            this.extendView = function (o) {
                if (typeof(o) !== "object")
                    throw new IllegalArgumentException('Mustache view should be extended with an object');
                $.extend(view, o);
                return this;
            };

            /**
             * Sets a template where Mustache's placeholders should be processed
             * @param o {jQuery|String} template text/object
             * @returns {Templatetor} current object (flow)
             */
            this.setTemplate = function (o) {
                if (typeof o !== "string" && !(o instanceof jQuery))
                    throw new IllegalArgumentException('Template should be a string or jQuery object');
                template = o;
                return this;
            };

            /**
             * Setter of replacement mode.
             * If replacement mode is on
             * @param b {Boolean} replacement mode switch
             * @returns {Templatetor}
             */
            this.replace = function (b) {
                if (typeof b !== "boolean")
                    throw new IllegalArgumentException('Argument should be boolean');
                replaceMode = b;
                return this;
            };

            /**
             * This method performs replacement of Mustache's placeholders with
             * data from view. If replacement mode enabled, method uses {@link $.fn.replaceText}
             * to perform replacements.
             * @returns {String} null if replacement mode is one, otherwise rendered string
             */
            this.render = function () {
                if (!template)
                    throw new IllegalStateException('Template is undefined');

                LOGGER.debug("TEMPLATORS VIEW");
                LOGGER.debug(view);

                $.extend(view, Templatetor.constructor.prototype.constView);
                LOGGER.debug(view);

                if ((template instanceof $) && replaceMode === true) {
                    template.find('*').replaceText(/{{([^}]+)}}/, function (fullMatch, key) {
                        return ((typeof view[key] !== "undefined") ? view[key] : key);
                    }, false);
                } else {
                    var tpl;
                    if (template instanceof $)
                        tpl = template.html();
                    else if (typeof(template) === "string")
                        tpl = template;
                    else
                        throw new IllegalStateException('Unknown type of template');

                    LOGGER.debug(view);
                    var rendered = _Mustache.render(tpl, view);
                }
                this.clean();
                return rendered;
            };

            /**
             * Cleans templatetor's view, template data and disabling replacement mode
             * @returns {Templatetor}
             */
            this.clean = function () {
                view = {};
                template = null;
                replaceMode = false;
                return this;
            };
        }
})(jQuery, Mustache, Logger);

/**
 * This is a static view that takes part in all templatetor's renderings
 */
Templatetor.constructor.prototype.constView = {};

/**
 * Extends a static view object
 * @param o {Object} an assoc array with replacements
 */
Templatetor.constructor.prototype.extendConstView = function (o) {
    if (typeof(o) === "object")
        $.extend(Templatetor.constructor.prototype.constView, o);
};

/**
 * This methods checks if string contains Mustache's placeholders and can be
 * processed with {@link Templatetor}
 * @param t {String} text to check
 * @returns {boolean} true, if text contains Mustache's placeholders, otherwise false
 */
Templatetor.constructor.prototype.templatable = function (t) {
    var txt;
    if (t instanceof $)
        txt = t.html();
    else if (typeof t === "string") {
        txt = t;
    } else {
        return false;
    }
    return txt.indexOf("{{") != -1;
};


//------------------------------SCORER PART-----------------------------------------------------
var Scorer = new
    (function () {
        var score;
        var userStepScores = [];

        var startTime;
        var endTime;
        var diffTime;
        var totalScore;

        /**
         * Starts monitoring
         */
        this.start = function () {
            score = 0;
            startTime = new Date();
        };

        /**
         * End monitoring
         */
        this.end = function () {
            endTime = new Date();
            diffTime = Math.round((endTime - startTime) / 1000);
        };

        /**
         * Adds points to user's global score
         * @param s {Number} amount of points
         */
        this.addScore = function (s) {
            if (typeof s !== "number")
                throw new IllegalStateException("Start scorer first!");
            else if (s > totalScore)
                throw new IllegalStateException("Illegal adding");
            score += s;
            this.addUserStepScores(s);
        };

        /**
         * Adds points to user's global score
         * @param s {Number} amount of points
         */
        this.addUserStepScores = function (s) {
            if (typeof s !== "number")
                throw new IllegalStateException("Start scorer first!");
            else if (s > totalScore)
                throw new IllegalStateException("Illegal adding");
            userStepScores.push(s);
        };


        /**
         * Gets a time when monitoring was started
         * @returns {String} formatted time string and false, if monitoring is not finished yet.
         */
        this.getFormattedStartTime = function () {
            if (!startTime)
                throw new IllegalStateException("Start scorer first!");
            return startTime.getHours() + ":" + startTime.getMinutes() + ":" + startTime.getSeconds();
        };

        /**
         * Gets a time when monitoring was ended
         * @returns {String} formatted time string and false, if monitoring is not finished yet.
         */
        this.getFormattedEndTime = function () {
            if (!startTime)
                throw new IllegalStateException("Finish scorer first!");
            return endTime.getHours() + ":" + endTime.getMinutes() + ":" + endTime.getSeconds();
        };

        /**
         * Gets time time difference between start and end of monitoring in seconds
         * @returns {Number} time diff in sec or false, if monitoring is not finished yet.
         */
        this.getTimeDifference = function () {
            if (!endTime)
                throw new IllegalStateException("Finish scorer first!");
            return diffTime;
        };

        /**
         * Gets a total users score
         * @returns {Number} user's total score or false, if monitoring is not finished yet.
         */
        this.getScore = function () {
            if (!endTime)
                throw new IllegalStateException("Finish scorer first!");
            return score;
        };

        /**
         * Gets a total users score in percent
         * @returns {string} user's total score or false, if monitoring is not finished yet.
         */
        this.getScoreInPercent = function () {
            if (!endTime)
                throw new IllegalStateException("Finish scorer first!");
            return (score / totalScore * 100).toFixed(0);
        };

        /**
         * Gets an array of users scores
         * @returns {Array} of user's step scores or false, if monitoring is not finished yet.
         */
        this.getUserStepScores = function () {
            if (!endTime)
                throw new IllegalStateException("Finish scorer first!");
            return userStepScores;
        };

        /**
         * Gets a trainer's score
         * @returns {Number} user's total score or false, if monitoring is not finished yet.
         */
        this.getTotalScore = function () {
            if (!endTime)
                throw new IllegalStateException("Finish scorer first!");
            return totalScore;
        };

        /**
         * Sets total score of the trainer
         * @param s {Number} amount of points
         */
        this.setTotalScore = function (s) {
            if (typeof s !== "number")
                throw new IllegalArgumentException("Score should be a number");
            totalScore = s;
        }
    });


//-----------------------------------I18N PART-----------------------------------------------------
var I18N = null;
(function ($, _Logger, _Templatetor) {
    /**
     * I18N is an object that provides translation of the trainer
     * @instance
     */
    I18N = new
        (function () {
            var LOGGER = new _Logger();
            var LANG_PATH = 'langs/';

            var langs = [];
            var currentLangData = null;
            var currentLangCode = null;

            /**
             * Sets a path to language files .json
             * @param p {String} path to language folder
             * @returns {I18N} current object (flow)
             */
            this.setPath = function (p) {
                LANG_PATH = p;
                return this;
            };

            /**
             * Sets an object of all available languages
             * @param a {Object} assoc array of allowed languages
             * @returns {I18N} current object (flow)
             */
            this.setAvailableLanguages = function (a) {
                if (typeof a !== "object")
                    throw new IllegalArgumentException("Langs should be an object (assoc array)");
                for (var key in a) {
                    if (a.hasOwnProperty(key)) {
                        langs[key] = a[key];
                    }
                }
                return this;
            };

            /**
             * Sets current language of trainer.
             * Language, specified by this setter, may be loaded with {@link I18N.loadLangugae}
             * @param l {String} language code
             * @returns {I18N} current object (flow)
             */
            this.setLanguage = function (l) {
                LOGGER.debug(langs);
                LOGGER.debug(langs.length);
                LOGGER.debug(typeof langs);

                if (!langs.hasOwnProperty(l)) {
                    LOGGER.info('Language is not one of available languages. I\'ll set another, ok?');
                    for (var code in langs) {
                        currentLangCode = code;
                        break;
                    }
                } else {
                    currentLangCode = l;
                }
                return this;
            };

            /**
             * Loads language data from json lang database
             * @param callback {function} a callback, that will be called after a successful download
             */
            this.loadLanguage = function (callback) {
                //noinspection JSUnresolvedFunction
                $.ajax({
                    url: LANG_PATH + currentLangCode + '.json',
                    dataType: "JSON"
                }).done(function (data) {
                    LOGGER.info('Language data loaded...');
                    if (!data || !data.hasOwnProperty('lang') || !data.hasOwnProperty('local'))
                        throw new IllegalDataException('Language file looks bad');

                    LOGGER.info('Language file is good');
                    currentLangData = data;
                    if (typeof(callback) === "function")
                        callback();
                }).fail(function (jqxhr, settings, exception) {
                    currentLangCode = null;
                    throw new IllegalAsyncStateException(exception);
                });
            };

            /**
             * Gets the language strings
             * @returns {Object} assoc array of lang constants
             */
            this.getConstants = function () {
                if (!currentLangData)
                    throw new IllegalStateException('Language file is not loaded');
                return currentLangData['lang'];
            };

            /**
             * Gets language names from available languages
             * @returns {Array} array of language code-local name pairs
             */
            this.getLangNames = function () {
                return langs;
            };

            /**
             * Gets a language code of current language
             * @returns {String} language code
             */
            this.getCurrentLang = function () {
                return currentLangCode;
            };

            /**
             * Returns correct word ending using cases
             * @param  iNumber Integer Number used to make ending
             * @param  aEndings Array Array of words or endings for numbers (1, 4, 5),
             *         e.g. ['яблоко', 'яблока', 'яблок']
             * @returns String
             */
            getNumEnding = function (iNumber, aEndings) {
                var sEnding, i;
                iNumber = iNumber % 100;
                if (iNumber >= 11 && iNumber <= 19) {
                    sEnding = aEndings[2];
                }
                else {
                    i = iNumber % 10;
                    switch (i) {
                        case (1):
                            sEnding = aEndings[0];
                            break;
                        case (2):
                        case (3):
                        case (4):
                            sEnding = aEndings[1];
                            break;
                        default:
                            sEnding = aEndings[2];
                    }
                }
                if (_Templatetor.templatable(sEnding))
                    sEnding = new _Templatetor().setTemplate(sEnding).render();
                return sEnding;
            }

        });
})(jQuery, Logger, Templatetor);


//---------------------------------SERVICE PART-----------------------------------------------------
var Service;
var ScriptInvoker;

(function ($, _Scorer, _Logger) {
    /**
     * This object contains some service methods
     * @instance
     */
    Service = new
        (function () {
            var LOGGER = new _Logger();
            var CONFIG_FILE = 'trainer/settings/trainer.config.json';
            var trainerVersion = '3.50';
            var trainerSetting = null;
            var reportUrl;

            /**
             * Trainer-related shared (coss-session and cross-user) storage for put_url and get_url
             * Can be accessed via getStorageUrl
             */
            var storageUrl;
            var help_canvas;
            var is_passed = 1;
            var self = this;

            /**
             * Sets trainer's config file path
             * @param p {String} path to trainer's config file
             * @returns {Service} current object (flow)
             */
            this.setConfigPath = function (p) {
                if (typeof p === "string")
                    CONFIG_FILE = p;
                return this;
            };

            /**
             * Gets trainer's settings, if they are loaded
             * @returns {*}
             */
            this.getTrainerConfig = function () {
                return trainerSetting;
            };

            /**
             * Loads trainer's config file
             * @param callback {function} callback to call after successful file loading
             */
            this.loadConfig = function (callback) {
                $.ajax({
                    url: CONFIG_FILE,
                    dataType: "JSON"
                }).done(function (data) {
                    trainerSetting = data;
                    if (typeof(callback) === "function")
                        callback();
                }).fail(commonAjaxFailException);
            };

            /**
             * Returns a value from URL query
             * @param name {String} query param's name
             * @param url {String} source for value extraction. Optional parameter, by default window.location.search
             * @returns {String} value of param
             */
            this.getUrlParam = function (name, url) {
                if (!url)
                    url = window.location.search;
                name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
                var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                    results = regex.exec(url);
                return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
            };

            /**
             * Loads external script file and appending it to DOM
             * @param url src prop of <script> tag
             * @param callback func
             */
            this.appendScript = function (url, callback) {
                var script = document.createElement("script");
                script.type = "text/javascript";
                if (script.readyState) {  //IE
                    script.onreadystatechange = function () {
                        if (script.readyState == "loaded" ||
                            script.readyState == "complete") {
                            script.onreadystatechange = null;
                            callback();
                        }
                    };
                } else {
                    script.onload = function () {
                        callback();
                    };
                }
                script.src = url;
                document.getElementsByTagName("head")[0].appendChild(script);
            };

            /**
             * About trainer
             * @returns string with info about jTrainer
             */
            this.about = function () {
                return '<h4>jTrainer v' + trainerVersion + '\nSumDU Distance Learning E-Trainer</h4>\n<br><strong>Framework authors</strong>: Ilia Ovchinnikov & Yevhenii Minin';
            };

            /**
             * Sends data about trainer start to SSU server
             * @param callback func that will be called after notifying
             */
            this.notifyServer = function (callback) {
                LOGGER.debug("Notifying server...");
                var server_info_url, server_url, send_report_url;
                server_info_url = getActionPath() + 'server_info.txt';
                LOGGER.debug('server_info_url: ' + server_info_url);
                $.get(server_info_url)
                    .done(function (data) {
                        server_url = 'https://' + window.location.host + data.replace('server_url=', '');
                        $.get(server_url)
                            .done(function (data) {
                                send_report_url = 'https://' + window.location.host + data.replace('send_report_url=', '');
                                $.get(send_report_url);
                                reportUrl = send_report_url;
                                if (typeof callback === "function")
                                    callback();
                            }).fail(commonAjaxFailException);
                    }).fail(commonAjaxFailException);
            };

            /**
             * Pushes user's results to SSU server. Old Behaviour, just for backward compatibility. Makes EndTrainer button disabled
             * @param options additional options to add to userResult variable
             * @param callback func i'll call when transferring is done
             */
            this.pushResults = function (options, callback) {
                $('a#endTrainer').attr('disabled','disabled').removeAttr('data-target');
                return Service.pushResultsPromise(options).then(callback, commonAjaxFailException);
            };


            /**
             * Pushes user's results to SSU server. Behaviour for done and fall is defined by .done and .fail methodes.
             * @param options additional options to add to userResult variable
             */
            this.pushResultsPromise = function (options) {
                if (!reportUrl)
                    throw new IllegalStateException('Server is not notified yet');

                var uScoreInPercent = _Scorer.getScoreInPercent();

                var userResult = {
                    total_points: 100,
                    user_points: uScoreInPercent,
                    is_done: 1,
                    is_passed: is_passed,
                    user_reply: uScoreInPercent >= 60 ? "YES - " + uScoreInPercent + "%" : "NO - " + uScoreInPercent + "%"
                };
                for (var key in options) {
                    if (options.hasOwnProperty(key)) {
                        userResult[key] = options[key];
                    }
                }
                LOGGER.debug("Sending user's result: " + JSON.stringify(userResult, null, 4));
                return $.post(reportUrl, userResult)
                    .done(function (data) {
                        LOGGER.debug("RESULT: " + data);
                        return data;
                    });
            };

            /**
             * Pushes user's results to SSU server
             * @param callback func i'll call when transferring is done
             */
            this.pushResultsEarly = function (callback) {
                Cogwheel.setText("Ending trainer");
                $('button#closeButton').click();
                Cogwheel.show();
                Scorer.addScore(setScoreOnPushResults());
                Scorer.end();
                is_passed = 1;
                Rotator.nextResults();
                return Service.pushResultsPromise().then(function () {
                    Cogwheel.setText("Trainer ended!");
                    setTimeout(function () {
                        Cogwheel.hide();
                    }, 3000);
                }).then(callback, commonAjaxFailException);
            };

            /**
             *  Return action URL ( path without id)
             */
            function getActionPath() {
                var host = window.location.href;
                host = host.substring(0, host.lastIndexOf('/') + 1);
                LOGGER.debug("ActionPath:" + host);
                return host;
            }

            var commonAjaxFailException = function (jqxhr, settings, exception) {
                throw new IllegalAsyncStateException(exception);
            };

            var setConfigValues = function (data, holder) {
                LOGGER.debug("Set config values by string: " + data);
                if (!holder)
                    holder = Service.getTrainerConfig();
                data = data.split('&');
                var arrayLength = data.length;
                for (var i = 0; i < arrayLength; i++) {
                    var key_and_value = data[i].split('=');
                    holder[key_and_value[0]] = decodeURIComponent(key_and_value[1] && key_and_value[1].replace(/\+/g, " "));
                }
                return holder;
            };

            /**
             * Return storageUrls holder (put_url, and get_url)
             * @returns promise with url
             */
            this.getStorageUrl = function () {
                if (storageUrl) {
                    return $.when(storageUrl);
                }
                return $.when($.get(getActionPath() + 'storage_info.txt'))
                    .then(function (data) {
                        storageUrl = {};
                        setConfigValues(data, storageUrl);
                        return storageUrl;
                    }, commonAjaxFailException)
            };

            /**
             * Get stored trainer-related data from SSU server. Data is cross-session and cross-user visible.
             * Value 'max_score' is rewrited by server.
             * @param callback func that will be called after fetching data, if data is fetched well.
             */
            this.fetchStorageInfo = function (callback) {
                LOGGER.debug("Get shared train-related data from server...");
                return this.getStorageUrl()
                    .then(function (url) {
                        var get_url = url['get_url'];
                        if (!get_url)
                            throw new IllegalStateException("Problem with storage get_url");
                        return get_url
                    })
                    .then($.get)
                    .then(function (data) {
                        LOGGER.debug("RESULT: " + data);
                        setConfigValues(data);
                        if (typeof callback === "function")
                            callback(data);
                    }, commonAjaxFailException);
            };

            /**
             * Push data to shared storage.
             * params 'max_score' is ignored, and rewrited by server.
             * @param push_data - hash, data to bush
             * @param callback - callback function, run if data is pushed well
             */
            this.pushStorageInfo = function (push_data, callback) {
                LOGGER.debug("Push shared train-related data to server...");
                this.getStorageUrl()
                    .done(function (url) {
                        var put_url = url['put_url'];
                        if (!put_url)
                            throw new IllegalStateException("Problem with storage put_url");
                        return put_url;
                    })
                    .done(function (url) {
                        $.post(url, push_data)
                    })
                    .then(callback, commonAjaxFailException);
            };

            /**
             * Get's help from SSU server
             * @param callback func i'll call when transferring is done
             */
            this.getHelpModal = function (callback) {
                Cogwheel.setText("Sending screenshot");
                Cogwheel.show();
                Scorer.end();
                var helper = $('input#helpInput').val();
                $('button#closeButton').click();
                window.setTimeout(function () {
                    html2canvas(document.body, {
                        onrendered: function (canvas) {
                            var options = {
                                help_image: canvas.toDataURL(),
                                help_text: helper,
                                is_done: 1,
                                is_passed: 0
                            };
                            self.pushResultsPromise(options)
                                .done(function () {
                                    Cogwheel.setText("Help request sent!");
                                    Cogwheel.hide();
                                })
                                .fail(function () {
                                    Cogwheel.setText("Fail!");
                                });
                        }
                    });
                }, 1000);
            };


            /**
             * CAREFUL THIS IS LEFT FOR COMPATIBILITY WITH OLDER VERSIONS - DO NOT USE ANYMORE
             * Get's help from SSU server
             * @param callback func i'll call when transferring is done
             */
            this.getHelp = function (callback) {
                Cogwheel.show();
                Scorer.end();
                //TODO Add i18n
                var helper = prompt("Please enter help message text:");
                window.setTimeout(function () {
                    html2canvas(document.body, {
                        onrendered: function (canvas) {
                            var options = {
                                help_image: canvas.toDataURL(),
                                help_text: helper,
                                is_done: 1,
                                is_passed: 0
                            };
                            self.pushResultsPromise(options)
                                .done(function () {
                                    Cogwheel.setText("Help request sent!");
                                    Cogwheel.hide();
                                })
                                .fail(function () {
                                    Cogwheel.setText("Fail!");
                                });
                        }
                    });
                }, 1000);
            };
        });
})(jQuery, Scorer, Logger);

(function ($, _Logger) {

    /**
     * This is a class to invoke functions by string including ability to
     * execute function from .js source file
     */
    ScriptInvoker = function () {
        var LOGGER = new _Logger();
        var clean = true;

        var sources = [];
        var loadedSources = [];
        var commands = [];

        /**
         * Auto clean invoker stack switch
         * @param b auto clean if true, otherwise saves stack values
         * @returns {ScriptInvoker} current object (flow)
         */
        this.autoClean = function (b) {
            clean = !!b;
            return this;
        };

        /**
         * Adds a source file to execute function from
         * @param src path to js file
         * @returns {ScriptInvoker} current object (flow)
         */
        this.addSource = function (src) {
            src = src + '';
            if (src.indexOf('.js') < 0)
                throw new IllegalArgumentException("Source must be a file with *.js extension");
            sources.push(src);
            return this;
        };

        /**
         * Adds a function and it's arguments to invoke
         * @param funct function name
         * @param args arguments of function
         * @returns {ScriptInvoker} current object (flow)
         */
        this.addCommand = function (funct, args) {
            commands.push([funct, $.makeArray(args)]);
            return this;
        };

        /**
         * Loads scripts from 'scripts' array
         * @param callback funct to call after loading
         * @param i pointer to current scr
         */
        var loadScripts = function (callback, i) {
            i = i || 0;
            if (sources.length == 0) {
                if (typeof callback == "function")
                    callback();
                return;
            }

            if ($.inArray(sources[i], loadedSources) >= 0) {
                if (i + 1 >= sources.length) {
                    if (typeof callback == "function")
                        callback();
                    return;
                }
                loadScripts(callback, ++i);
            }

            $.getScript(sources[i])
                .done(function () {
                    LOGGER.debug("Script from " + sources[i] + " loaded successfully");
                    loadedSources.push(sources[i]);
                    if (i >= (sources.length - 1)) {
                        if (typeof callback == "function")
                            callback();
                    } else {
                        loadScripts(callback, ++i);
                    }
                }).fail(function (jqxhr, settings, exception) {
                LOGGER.error("Failed to load data from source: " + sources[i]);
            });
        };

        /**
         * Starts to invoking commands
         */
        this.invoke = function () {
            var cmd, f, gf, args;

            LOGGER.debug("Loading scripts from sources:", sources);
            var self = this;
            loadScripts(function () {
                LOGGER.debug('Invoking commands:', commands);
                for (var i in commands) {
                    cmd = commands[i];
                    f = cmd[0]; args = cmd[1];

                    if (typeof f == "function")
                        f.apply(null, args);
                    else {
                        gf = window[(f + '')];
                        LOGGER.debug("Calling", f, gf);
                        if (gf)
                            gf.apply(null, args);
                        else
                            LOGGER.error("Tried to invoke not existing function " + f);
                    }
                }
                if (clean)
                    self.clear();
            });
        };

        /**
         * Clears sources and commands stacks
         * @returns {ScriptInvoker} current object (flow)
         */
        this.clear = function () {
            sources.length = 0;
            commands.length = 0;
            return this;
        }
    };
})(jQuery, Logger);

/**
 * This is an instance of ScriptInvoker used by engine, especially by rotator.
 * Rotator invokes all commands of StepInvoker after calling nextStep()
 *
 * Used for executing necessary scripts for elements etc
 * @type {ScriptInvoker}
 */
var StepInvoker = new ScriptInvoker();

function IllegalArgumentException(message) {
    this.name = 'IllegalArgumentException';
    this.message = message;
    this.stack = (new Error).stack;
    this.toString = function () {
        return this.name + (!!this.message ? ': ' + this.message : '');
    };
}

function IllegalStateException(message) {
    this.name = 'IllegalStateException';
    this.message = message;
    this.stack = (new Error).stack;
    this.toString = function () {
        return this.name + (!!this.message ? ': ' + this.message : '');
    };
}

function NoArgumentException(message) {
    this.name = 'NoArgumentException';
    this.message = message;
    this.stack = (new Error).stack;
    this.toString = function () {
        return this.name + (!!this.message ? ': ' + this.message : '');
    };
}

function IllegalDataException(message) {
    this.name = 'IllegalDataException';
    this.message = message;
    this.stack = (new Error).stack;
    this.toString = function () {
        return this.name + (!!this.message ? ': ' + this.message : '');
    };
}

function IllegalAsyncStateException(message) {
    this.name = 'IllegalAsyncStateException';
    this.message = message;
    this.stack = (new Error).stack;
    this.toString = function () {
        return this.name + (!!this.message ? ': ' + this.message : '');
    };
}


//------------------------------COLLECTIONS PART-----------------------------------------------------
String.prototype.escapeHTML = function () {
    return document.createElement('div')
        .appendChild(document.createTextNode(this))
        .parentNode
        .innerHTML
};

var Map = function () {
    var db = [];

    /**
     * Returns index of elements pair in Map
     * @param k {*} key to find
     * @returns {Number} index of elements pair if exists, otherwise -1
     */
    var getIndexOfKey = function (k) {
        for (var i = 0; i < db.length; i++) {
            if (db[i][0] == k)
                return i;
        }
        return -1;
    };

    /**
     * Adds key-value pair in map
     * @param k {*} a pair's key
     * @param v {*} a pair's value
     * @returns {Map} current object (flow)
     */
    this.add = function (k, v) {
        var index = getIndexOfKey(k);
        if (index === -1)
            db.push([k, v]);
        else
            db[index][1] = v;
        return this;
    };

    /**
     * Getss a value pair in map by key
     * @param k {*} a pair's key
     * @returns {*} value if exists, otherwise null
     */
    this.get = function (k) {
        for (var i = 0; i < db.length; i++) {
            if (db[i][0] == k)
                return db[i][1];
        }
        return null;
    };

    /**
     * Returns a size of map
     * @returns {Number} amount of elements
     */
    this.size = function () {
        return db.length;
    };

    /**
     * Returns all keys from this map
     * @returns {Array} keys of map
     * @override
     */
    this.keys = function () {
        if (db.length === 0)
            return [];
        var result = [];
        for (var i = 0; i < db.length; i++) {
            result.push(db[i][0]);
        }
        return result;
    };

    /**
     * Returns all values from this map
     * @returns {Array} values of map
     */
    this.values = function () {
        if (db.length === 0)
            return [];
        var result = [];
        for (var i = 0; i < db.length; i++) {
            result.push(db[i][1]);
        }
        return result;
    };

    /**
     * Ramdomize map's elements
     * @returns {Map} randomized map
     */
    this.randomize = function () {
        if (db.length === 0)
            return this;
        var currentIndex = db.length, temporaryValue, randomIndex;
        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            temporaryValue = db[currentIndex];
            db[currentIndex] = db[randomIndex];
            db[randomIndex] = temporaryValue;
        }
        return this;
    };

    /**
     * Map's iterator. For each map's key-value pair calls callback
     * with (key, value) params
     * @param callback {function} function to call
     * @returns {boolean} true, if there are elements in map, otherwise false
     */
    this.iterate = function (callback) {
        if (db.length === 0)
            return false;
        for (var i = 0; i < db.length; i++) {
            callback(db[i][0], db[i][1]);
        }
        return true;
    };

    /**
     * Create a sliced copy of this map
     * @param start {number} first element position
     * @param end {number} last element position
     * @returns {Map} new sliced map
     */
    this.slice = function (start, end) {
        if (start >= db.length || end >= db.length)
            throw new IllegalArgumentException('Start and end positions should be < that hashMap\'s size');
        var result = new Map();
        for (var i = start; i <= end; i++) {
            result.add(db[i][0], db[i][1]);
        }
        return result;
    };

    /**
     * Merge another map's key-value pairs with this one
     * @param m {Map} map to merge
     * @returns {Map} current object (flow)
     */
    this.merge = function (m) {
        if (m instanceof Map) {
            var self = this;
            m.iterate(function (key, value) {
                self.add(key, value);
            });
        }
        return this;
    };
};


//--------------------------------ELEMENTS PART-----------------------------------------------------
function Element() {
        this.name,
        this.label,
        this.value,
        this.attributes = '',
        this.classes = ['form-control'],
        this.id = '',
        this.style;

    /**
     * Sets element's name
     * @param nm {String} name of the element
     * @returns {Element} current object {flow)
    */
    this.setName = function (nm) {
        if (typeof nm !== "string")
            throw new IllegalArgumentException("Name should be a string");
        this.name = nm;
        return this;
    };

    /**
     * Gets element's name
     * @returns {String} name of the element
     */
    this.getName = function () {
        return this.name;
    };

    /**
     * Sets a label of element
     * @param l {String} label of element
     * @returns {Element} current object {flow)
    */
    this.setLabel = function (l) {
        if (typeof l !== "string")
            throw new IllegalArgumentException("Label should be a string");
        this.label = l;
        return this;
    };

    /**
     * Gets a label of element
     * @returns {String} label of element
     */
    this.getLabel = function () {
        return this.label;
    };

    /**
     * Sets a value of element
     * @param v {String|Number} element's value
     * @returns {Element} current object {flow)
    */
    this.setValue = function (v) {
        if (typeof v !== "string" && typeof v !== "number")
            throw new IllegalArgumentException("Value should be a string or number");
        this.value = v;
        return this;
    };

    /**
     * Gets a value of element
     * @returns {String} element's value
     */
    this.getValue = function () {
        if (this.value) {
            return this.value.toString();
        }
        return this.value;
    };

    /**
     * Sets #id to element
     * @param id id tag's value
     * @returns {Element} current object {flow)
     */
    this.setId = function (id) {
        this.id = id + '';
        return this;
    };

    /**
     * Gets element's style
     * @returns {string}
     */
    this.getStyle = function () {
        return this.style;
    };

    /**
     * Sets element's style
     * @param st element's style
     * @returns {Element} current object {flow)
     */
    this.setStyle = function (st) {
        this.style = st + '';
        return this;
    };

    /**
     * Gets element's id
     * @returns {string}
     */
    this.getId = function () {
        return this.id;
    };

    /**
     * Returns all params of elements in one string
     * @returns {string} string of params
     */
    this.getParams = function () {
        return ' ' + (this.getName() ? 'name="' + this.getName() + '" ' : '') +
            (this.getId() ? 'id="' + this.getId() + '" ' : '') +
            (this.getAttributes() ? this.getAttributes() + " " : '') +
            (this.getClasses().length > 0 ? 'class="' + this.getClasses().join(' ') + '"' : '') +
            (this.getStyle() ? 'style="' + this.getStyle() + '" ' : '') + ' ';

    };
    /**
     * Renders the element
     * SHOULD BE OVERRIDDEN
     * @returns {String} rendered element
     */
    this.render = function () {
        if (!this.getName() || !this.getValue())
            throw new NoArgumentException('Check name and value of element');
        return '<!-- Your element should go here -->';
    };

    /**
     * Adds attribute to element
     * @param n {String} attribute's name
     * @param v {String|Number} attribute's value
     * @returns {Element} current object {flow)
    */
    this.addAttribute = function (n, v) {
        if (typeof n !== "string")
            throw new IllegalArgumentException("Attribute's name should be a string");
        else if (typeof v !== "string" && typeof v !== "number")
            throw new IllegalArgumentException("Value of attribute should be a string or number");
        this.attributes += ' ' + n + '="' + v.toString() + '"';
        return this;
    };

    /**
     * Gets attributes of element
     * @returns {String} of attribute=value pairs
     */
    this.getAttributes = function () {
        return this.attributes;
    };

    /**
     * Adds class to element
     * @param c {String} class name to add
     * @returns {Element} current object {flow)
    */
    this.addClass = function (c) {
        if (typeof c !== "string")
            throw new IllegalArgumentException("Class should be a string");
        this.classes.push(c);
        return this;
    };

    /**
     * Gets classes of element
     * @returns {String} of classes
     */
    this.getClasses = function () {
        return this.classes;
    };

    /**
     * Removes class of element
     * @param c {String} class name to remove
     * @returns {Element} current object {flow)
    */
    this.removeClass = function (c) {
        this.classes = $.grep(this.classes, function (value) {
            return value != c;
        });
        return this;
    };

    /**
     * Clears all classes of element
     * @returns {Element} current object {flow)
     */
    this.clearClasses = function () {
        this.classes = [];
        return this;
    };
}
var Select = null;
var CheckBox = null;
var Radio = null;
var Radios = null;
var TextInput = null;
var TextArea = null;

var DraggableGroup = null;
var DroppableArea = null;

var WolframAlpha = null;
var GoogleCharts = null;
var LateX = null;

(function ($, _Templatetor, _StepInvoker) {
    Radio = function (n) {
        if (typeof n === "string")
            this.setName(n);
        var checked = false;

        /**
         * Makes radio checked
         * @param b {Boolean} isChecked switch
         * @returns {Radio} current object {flow)
         */
        this.checked = function (b) {
            if (typeof b !== "boolean")
                throw new IllegalArgumentException("Checked state should be a bool value");
            checked = b;
            return this;
        };

        /**
         * Renders the element
         * @returns {String} rendered element
         */
        this.render = function () {
            if (!this.getName() || !this.getValue())
                throw new NoArgumentException('Check name and value of element');
            this.removeClass('form-control');
            var result = '<label id="radios">\n';
            result += '<input type="radio"' + this.getParams() + 'value="' + this.getValue() + '" ' + (checked === true ? 'checked="checked"' : '') + '>\n';
            result += '\n<span class="radio-text">';
            result += this.getLabel();
            result += '</span></label>';

            if (_Templatetor.templatable(result))
                result = new _Templatetor().setTemplate(result).render();
            return result;
        };
    };
    Radio.prototype = new Element();
    Radio.prototype.constructor = Radio;

    Radios =
        function (n) {
            if (typeof n === "string")
                this.setName(n);
            var options = [];

            /**
             * Scramble options inside radio group
             */
            this.randomize = function () {
                var currentIndex = options.length, temporaryValue, randomIndex;
                while (0 !== currentIndex) {
                    randomIndex = Math.floor(Math.random() * currentIndex);
                    currentIndex -= 1;
                    temporaryValue = options[currentIndex];
                    options[currentIndex] = options[randomIndex];
                    options[randomIndex] = temporaryValue;
                }
                return this;
            };
            /**
             * Adds a radio to radio-group
             * @param label {String} text of option
             * @param value {String} value of option
             * @param checked {Boolean} if this radio checked
             * @returns {Radios} current object {flow)
             */
            this.addRadio = function (label, value, checked) {
                if (typeof value !== "string" && typeof value !== "number")
                    throw new IllegalArgumentException('Value should be a number of string');
                else if (!this.getName())
                    throw new IllegalStateException('Specify name of the radio-group first!');
                this.setLabel(label);
                this.setValue(value);
                var radio = new Radio(this.getName()).setValue(this.getValue()).checked(!!checked);
                if (this.getLabel())
                    radio.setLabel(this.getLabel());
                options.push(radio);
                return this;
            };

            /**
             * Renders the element
             * @returns {String} rendered element
             */
            this.render = function () {
                if (options.length == 0)
                    throw new NoArgumentException('Nothing to render. Please add at least one radio.');
                var result = '<div class="radios form-group" for="' + this.getName() + '">\n';
                for (var i = 0; i < options.length; i++)
                    result += options[i].render();
                result += '</div>\n';
                return result;
            };
        };
    Radios.prototype = new Element();
    Radios.prototype.constructor = Radios;

    CheckBox =
        function (n) {
            if (typeof n === "string")
                this.setName(n);


            /**
             * Renders the element
             * @returns {String} rendered element
             */
            this.render = function () {
                if (!this.getName())
                    throw new NoArgumentException('Please check element\'s name.');
                this.removeClass('form-control');
                var result = '<div class="form-group" for="' + this.getName() + '">\n';
                result += '<div class="checkbox">\n';
                result += '<label>\n';
                result += '<input type="checkbox"' + this.getParams() + 'values="' + this.getValue() + '" >' + (this.getLabel() ? this.getLabel() : '') + '\n';
                result += '</label>\n';
                result += '</div>\n';
                if (_Templatetor.templatable(result))
                    result = new _Templatetor().setTemplate(result).render();
                return result;
            };
        };
    CheckBox.prototype = new Element();
    CheckBox.prototype.constructor = CheckBox;


    /**
     * This class in a wrapper to html select tag.
     * @param n {String} select's name
     * @constructor
     */
    Select =
        function (n) {
            if (typeof n === "string")
                this.setName(n);
            var options = [];

            /**
             * Scramble options inside select group
             */
            this.randomize = function () {
                var currentIndex = options.length, temporaryValue, randomIndex;
                while (0 !== currentIndex) {
                    randomIndex = Math.floor(Math.random() * currentIndex);
                    currentIndex -= 1;
                    temporaryValue = options[currentIndex];
                    options[currentIndex] = options[randomIndex];
                    options[randomIndex] = temporaryValue;
                }
                return this;
            };

            /**
             * Adds an option tag to element
             * @param label {String} text of element
             * @param value {String} value of element
             * @param checked {Boolean} is this option checked
             * @returns {Select} current object {flow)
             */
            this.addOption = function (label, value, checked) {
                if (typeof value !== "string" && typeof value !== "number")
                    throw new IllegalArgumentException('Value should be a number of string');
                options.push([label, value, !!checked]);
                return this;
            };

            /**
             * Makes element disabled
             * @param b {Boolean} isActive switch
             * @returns {Select} current object {flow)
             */
            this.disabled = function (b) {
                if (typeof b !== "boolean")
                    throw new IllegalArgumentException("Switch should be boolean");
                b === true ? this.addClass('disabled') : this.removeClass('disabled');
                return this;
            };

            /**
             * Renders the element
             * @returns {String} rendered element
             */

            this.render = function () {
                if (!this.getName() || Object.keys(options).length == 0)
                    throw new Error('Please check element\'s name, values and default value');
                var result = '<div class="form-group" for="' + this.getName() + '">\n';
                result += '<select' + this.getParams() + '>\n';
                result += '<option value="-1" selected="selected" disabled="disabled">{{CHOOSE_SELECT}}</option>\n';

                for (var i = 0; i < options.length; i++)
                    result += '<option value="' + options[i][1] + '"' + (options[i][2] === true ? ' selected="selected"' : '') + '>' + options[i][0] + '</option>\n';

                result += '</select>\n';
                result += '</div>\n';

                if (_Templatetor.templatable(result))
                    result = new _Templatetor().setTemplate(result).render();
                return result;
            };
        };
    Select.prototype = new Element();
    Select.prototype.constructor = Select;

    /**
     * This class in a wrapper to html text input.
     * @param n {String} input's name
     * @constructor
     */
    TextInput =
        function (n) {
            if (typeof n === "string")
                this.setName(n);
            var placeholder = '{{ENTER_TEXT}}';

            /**
             * Sets placeholder text
             * @param text {String} placeholder text
             * @returns {TextInput} current object {flow)
             */
            this.placeholder = function (text) {
                if (typeof text !== "string")
                    throw new IllegalArgumentException("Placeholder should be a string");
                placeholder = text;
                return this;
            };

            /**
             * Makes element disabled
             * @param b {Boolean} isActive switch
             * @returns {TextInput} current object {flow)
             */
            this.disabled = function (b) {
                if (typeof b !== "boolean")
                    throw new IllegalArgumentException("Switch should be boolean");
                b === true ? this.addClass('disabled') : this.removeClass('disabled');
                return this;
            };

            /**
             * Renders the element
             * @returns {String} rendered element
             */
            this.render = function () {
                if (!this.getName())
                    throw new Error('Please check element\'s name. It\'s empty.');
                var result = '<div class="form-group" for="' + this.getName() + '">\n';
                result += '<input' + this.getParams() + 'type="text" placeholder="' + placeholder + '">\n';
                result += '</div>\n';
                if (_Templatetor.templatable(result))
                    result = new _Templatetor().setTemplate(result).render();
                return result;
            };
        };
    TextInput.prototype = new Element();
    TextInput.prototype.constructor = TextInput;

    /**
     * This class in a wrapper to html text area input.
     * @param n {String} input's name
     * @constructor
     */
    TextArea =
        function (n) {
            TextInput.call(this, n);

            var placeholder = '{{ENTER_TEXT}}';

            this.render = function () {
                if (!this.getName())
                    throw new Error('Please check element\'s name. It\'s empty.');
                var result = '<div class="form-group" for="' + this.getName() + '">\n';
                result += '<textarea' + this.getParams() + ' placeholder="' + placeholder + '">';
                if (this.value) {
                    result += this.value.toString().escapeHTML();
                }
                result += '</textarea>\n';
                result += '</div>\n';
                if (_Templatetor.templatable(result))
                    result = new _Templatetor().setTemplate(result).render();
                return result;
            };
        };

    TextArea.prototype = new TextInput();
    TextArea.prototype.constructor = TextArea;

    DroppableArea =
        function (n) {
            if (typeof n === "string")
                this.setName(n);

            /**
             * Renders the element
             * @returns {String} rendered element
             */
            this.render = function () {
                if (this.getName().length == 0)
                    throw new Error('Please check element\'s name');
                this.removeClass('form-control').addClass('droppable');
                var result = '<div class="form-group droppable-area" for="' + this.getName() + '">\n';
                result += '<div' + this.getParams() + '></div>\n';
                result += '</div>\n';
                if (_Templatetor.templatable(result))
                    result = new _Templatetor().setTemplate(result).render();
                _StepInvoker.addSource('/cdn/javascripts/jtrainer/current/js/additions/drag-drops.js').addCommand('makeDroppable', this.getName());
                return result;
            };
        };
    DroppableArea.prototype = new Element();
    DroppableArea.prototype.constructor = DroppableArea;

    DraggableGroup =
        function (n) {
            if (typeof n === "string")
                this.setName(n);
            var options = [];

            /**
             * Scramble options inside Draggable group
             */
            this.randomize = function () {
                var currentIndex = options.length, temporaryValue, randomIndex;
                while (0 !== currentIndex) {
                    randomIndex = Math.floor(Math.random() * currentIndex);
                    currentIndex -= 1;
                    temporaryValue = options[currentIndex];
                    options[currentIndex] = options[randomIndex];
                    options[randomIndex] = temporaryValue;
                }
                return this;
            };

            this.addOption = function (label, value) {
                if (!label || !value)
                    throw new IllegalArgumentException("Please check arguments at DraggableGroup!");
                options.push([label + '', value + '']);
                return this;
            };

            /**
             * Renders the element
             * @returns {String} rendered element
             */
            this.render = function () {
                if (this.getName().length == 0)
                    throw new Error('Please check element\'s name');
                else if (options.length == 0)
                    throw new Error('Nothing to add into DraggableGroup! Please add some options to DraggableGroup!');

                this.removeClass('form-control');
                var result = '<div class="draggables" name="' + this.getName() + '">\n';
                for (var i = 0; i < options.length; i++) {
                    result += '<div class="draggable ' + this.getClasses().join(" ") + '" value="' + options[i][1] + '"><span>';
                    result += options[i][0];
                    result += '</span></div>\n';
                }
                result += '</div>\n';
                if (_Templatetor.templatable(result))
                    result = new _Templatetor().setTemplate(result).render();
                _StepInvoker.addSource('/cdn/javascripts/jtrainer/current/js/additions/drag-drops.js').addCommand('makeDraggable', this.getName());
                return result;
            };
        };
    DraggableGroup.prototype = new Element();
    DraggableGroup.prototype.constructor = DraggableGroup;

    /**
     * This class is a wrapper to WolframAlpha API.
     * @constructor
     */
    WolframAlpha =
        function () {
            var query;

            /**
             * Performs a query with WolframAlpha API through SumDU server
             * @param callback {function} callback to call after loading
             */
            this.doQuery = function (callback) {
                $.ajax({url: "https://dl.sumdu.edu.ua/api/v1/content/alpha", data: {input: query}, dataType: "jsonp"})
                    .done(function (json) {
                        var xml = $.parseXML(json.result);
                        if (typeof callback === "function")
                            callback(xml);
                    }).fail(function (jqxhr, settings, exception) {
                    throw new IllegalAsyncStateException(exception);
                });
            };

            /**
             * Sets a query to perform
             * @param q {String} query sting
             * @returns {WolframAlpha} current object (flow)
             */
            this.setQuery = function (q) {
                if (typeof q !== "string")
                    throw new IllegalArgumentException("Query should be a string");
                query = q;
                return this;
            };

            /**
             * Checks if query was specified
             * @returns {boolean} true if query is specified, otherwise - false
             */
            var hasQuery = function () {
                return !!query;
            };

            /**
             * This method src to plot image, drawn by WolframAlpha
             * @param callback {function} callback to call after receiving img src
             */
            this.plot = function (callback) {
                if (hasQuery() && typeof callback === "function") {
                    query = 'plot ' + query;
                    this.doQuery(function (data) {
                        var src = $(data).find("#Plot subpod:first img").attr("src");
                        callback(src);
                    });
                }
            };
        };

    /**
     * This class is a wrapper to WolframAlpha API.
     * @constructor
     */
    GoogleCharts =
        function () {
            var chartType;
            var chartData;
            var chartOptions;
            var chartLibrary;

            this.setType = function (type) {
                if (typeof type !== "string")
                    throw new IllegalArgumentException("chartType should be a string");
                chartType = type;
            };

            this.setData = function (data) {
                if (!Array.isArray(data))
                    throw new IllegalArgumentException("chartData should be an array!");
                chartData = data;
            };

            this.setOptions = function (options) {
                if (typeof options !== 'object')
                    throw new IllegalArgumentException("chartOptions should be an json object!");
                chartOptions = options;
            };

            this.setLibrary = function (library) {
                if (typeof library !== "string")
                    throw new IllegalArgumentException("chartLibrary should be a string");
                chartLibrary = library;
            };

            /**
             * Performs a query with WolframAlpha API through SumDU server
             * @param callback {function} callback to call after loading
             */
            this.doQuery = function (id) {
                $.ajax({
                    url: 'https://www.google.com/jsapi?callback',
                    cache: true,
                    dataType: 'script',
                    success: function () {
                        google.load('visualization', '1.1', {
                            packages: [chartType], 'callback': function () {
                                var data = google.visualization.arrayToDataTable(chartData);

                                var chart = eval("new " + chartLibrary + "(id[0])");
                                chart.draw(data, chartOptions);
                            }
                        });
                    },
                    error: function () {
                        throw new IllegalAsyncStateException("Problem with building a chart");
                    }
                })
            };
        };

    /**
     * Class for rendering LateX formulas
     * @constructor
     */
    LateX =
        function () {
            var formula;

            /**
             * Sets a LateX text to render
             * @param f {String} LateX formtted string
             * @returns {LateX} current object (flow)
             */
            this.setFormula = function (f) {
                if (typeof f !== "string")
                    throw new IllegalArgumentException("LateX formula should be a string");
                formula = f;
                return this;
            };

            /**
             * Renders LateX formula
             * @returns {String} rendered formula as an img tag
             */
            this.render = function () {
                if (!formula)
                    throw new NoArgumentException('Set formula first!');
                return '<img class="latex" src="http://latex.codecogs.com/svg.latex?' + formula + '" border="0"/>';
            };
        };
})(jQuery, Templatetor, StepInvoker);


//-----------------------------COGWHEEL PART-----------------------------------------------------
var Cogwheel = new
    (function () {
        var cogwheelElement;
        var cogwheelDescElement;

        /**
         * Sets a wrapped DOM element to show on loading
         * @param o {jQuery} wrapped element
         * @returns {Cogwheel} current object (flow)
         */
        this.setCogWheelElement = function (o) {
            if (!(o instanceof $))
                throw new IllegalArgumentException('CogWheel should be an instance of $');
            cogwheelElement = o;
            return this;
        };

        /**
         * Sets a wrapped DOM element where loading description situated
         * @param o {jQuery} wrapped element
         * @returns {Cogwheel} current object (flow)
         */
        this.setCogWheelDescElement = function (o) {
            if (!(o instanceof $))
                throw new IllegalArgumentException('CogWheel should be an instance of $');
            cogwheelDescElement = o;
            this.setText('Processing...');
            return this;
        };

        /**
         * Sets a loading description
         * @param s {String} description
         * @returns {Cogwheel} current object (flow)
         */
        this.setText = function (s) {
            if (!cogwheelDescElement)
                throw new IllegalStateException('Set description $ object first!');
            else if (typeof s !== "string")
                throw new IllegalArgumentException('Text should be a string');
            cogwheelDescElement.html(s);
            return this;
        };

        /**
         * Shows a loading splash
         * @returns {Cogwheel} current object (flow)
         */
        this.show = function () {
            if (!cogwheelElement)
                throw new IllegalStateException('Set cogwheel $ object first!');
            cogwheelElement.modal('show');
            return this;
        };

        /**
         * Hides a loading splash
         * @returns {Cogwheel} current object (flow)
         */
        this.hide = function () {
            if (!cogwheelElement)
                throw new IllegalStateException('Set cogwheel $ object first!');
            cogwheelElement.modal('hide');
            return this;
        };
    });


//-----------------------------BreadCrumb PART-----------------------------------------------------
var BreadCrumb = new
    (function () {
        var breadCrumbElement;

        /**
         * Sets a breadcrumb to display step names
         * @param o {jQuery} wrapped element
         * @returns {Cogwheel} current object (flow)
         */
        this.setBreadCrumbElement = function (o) {
            if (!(o instanceof $))
                throw new IllegalArgumentException('BreadCrumb should be an instance of $');
            breadCrumbElement = o;
            return this;
        };

        /**
         * Sets a breadcrumb at top of page to display step names
         */
        this.setBreadCrumbStepNames = function (step) {
            var result = '';
            for (var i = 1; i <= Rotator.getStepsCount(); i++) {
                if (step === i)
                    result += '<li><a href="#">{{STEP' + i + '_NAME}}</a></li>';
                else {
                    result += '<li>{{STEP' + i + '_NAME}}</li>';
                }
            }
            if (Templatetor.templatable(result))
                result = new Templatetor().setTemplate(result).render();
            breadCrumbElement.html(result);
        };


        /**
         * Shows breadcrumb
         * @returns {BreadCrumb} current object (flow)
         */
        this.show = function () {
            if (!breadCrumbElement)
                throw new IllegalStateException('Set breadcrumb $ object first!');
            breadCrumbElement.show();
            return this;
        };

        /**
         * Hides breadcrumb
         * @returns {BreadCrumb} current object (flow)
         */
        this.hide = function () {
            if (!breadCrumbElement)
                throw new IllegalStateException('Set breadcrumb $ object first!');
            breadCrumbElement.hide();
            return this;
        };
    });


//-----------------------------ProgressBar PART-----------------------------------------------------
var ProgressBar = new
    (function () {
        var progressBarElement;

        /**
         * Sets a progressbar to display trainer completition progress
         * @param o {jQuery} wrapped element
         * @returns {Cogwheel} current object (flow)
         */
        this.setProgressBarElement = function (o) {
            if (!(o instanceof $))
                throw new IllegalArgumentException('ProgressBar should be an instance of $');
            progressBarElement = o;
            return this;
        };

        /**
         * Changes progressbar completition state
         */
        this.changeProgressBarState = function (total, next) {
            var fullness;
            if (total != 0)
                fullness = (next / total * 100).toFixed(1) + '%';
            else
                fullness = '0%';
            progressBarElement.width(fullness);
            return true;
        };


        /**
         * Shows progressbar
         * @returns {ProgressBar} current object (flow)
         */
        this.show = function () {
            if (!progressBarElement)
                throw new IllegalStateException('Set progressbar $ object first!');
            progressBarElement.show();
            return this;
        };

        /**
         * Hides progressbar
         * @returns {ProgressBar} current object (flow)
         */
        this.hide = function () {
            if (!progressBarElement)
                throw new IllegalStateException('Set progressbar $ object first!');
            progressBarElement.hide();
            return this;
        };
    });

//------------------------------------ROTATOR PART-----------------------------------------------------
var Rotator = null;

(function ($, Log, Tpl, _Scorer, _Service, _StepInvoker, _Cogwheel, _BreadCrumb, _ProgressBar) {
    /**
     * Rotator is one of the main object of trainer that is responsible for the rotation
     * of steps
     * @instance
     */
    Rotator = new
        (function () {
            var self = this;
            var LOGGER = new Log();
            var TEMPLATETOR = new Tpl();

            var STEP_PATH = 'trainer/';
            var SCRIPTS_PATH = STEP_PATH + 'scripts/';
            var SETTINGS_PATH = STEP_PATH + 'settings/trainer.steps.json';
            var settings = null;
            var stepSpace = null;
            var stepsCount = 0;

            var lastLoadedStep = 0;
            var visibleStep = 0;

            var nextButton = null;
            var prevButton = null;

            /**
             * Ties up an wrapped DOM element of Prev Button
             * @param o {jQuery} wrapped DOM element of Prev Button
             * @returns {Rotator} current object (flow)
             */
            this.setPrevButton = function (o) {
                if (!(o instanceof $))
                    throw new IllegalArgumentException('Controller should be an instance of $');
                prevButton = o;
                return this;
            };

            /**
             * Ties up an wrapped DOM element of Next Button
             * @param o {jQuery} wrapped DOM element of Next Button
             * @returns {Rotator} current object (flow)
             */
            this.setNextButton = function (o) {
                if (!(o instanceof $))
                    throw new IllegalArgumentException('Controller should be an instance of $');
                nextButton = o;
                return this;
            };

            /**
             * Enables next button
             * @returns {Rotator} current object (flow)
             */
            this.enableNextButton = function () {
                if (nextButton)
                    nextButton.removeClass('btn-default')
                        .addClass('btn-primary')
                        .removeClass('disabled')
                        .attr('onclick', 'Rotator.nextStep()');
                return this;
            };

            /**
             * Disables next button
             * @returns {Rotator} current object (flow)
             */
            this.disableNextButton = function () {
                if (nextButton)
                    nextButton.addClass('disabled')
                        .removeClass('btn-primary')
                        .addClass('btn-default')
                        .attr('onclick', '');
                return this;
            };

            /**
             * Enables prev button
             * @returns {Rotator} current object (flow)
             */
            this.enablePrevButton = function () {
                if (prevButton)
                    prevButton.removeClass('disabled')
                        .attr('onclick', 'Rotator.prevStep()');
                return this;
            };

            /**
             * Disables prev button
             * @returns {Rotator} current object (flow)
             */
            this.disablePrevButton = function () {
                if (prevButton)
                    prevButton.addClass('disabled')
                        .attr('onclick', '');
                return this;
            };

            /**
             * Sets patch to steps files
             * @param p {String} step path
             * @returns {Rotator} current object (flow)
             */
            this.setStepsPath = function (p) {
                STEP_PATH = p;
                return this;
            };

            /**
             * Sets patch to step's script files
             * @param p {String} step's scripts path
             * @returns {Rotator} current object (flow)
             */
            this.setScriptsPath = function (p) {
                SCRIPTS_PATH = p;
                return this;
            };

            /**
             * Sets patch to step's setting files
             * @param p {String} step path
             * @returns {Rotator} current object (flow)
             */
            this.setSettingsPath = function (p) {
                SETTINGS_PATH = p;
                return this;
            };

            /**
             * Sets an object where steps will be loaded
             * @param p {jQuery} wrapped DOM element
             * @returns {Rotator} current object (flow)
             */
            this.setStepSpace = function (ss) {
                if (!(ss instanceof $))
                    throw new IllegalArgumentException('Step\'s space should be an instance of jQuery');
                else if (ss.length == 0)
                    throw new IllegalStateException('There is no such element in DOM');
                stepSpace = ss;
                return this;
            };

            /**
             * Pushes data into step's space
             * @param data {String} data
             */
            var toStepSpace = function (data) {
                if (!stepSpace || stepSpace.length == 0)
                    throw new IllegalStateException('Step space is undefined');
                stepSpace.append(data);
            };

            /**
             * Gets a max score for next step
             * @param step {Number} step's index
             * @returns {Numeric} amount of points for this step
             */
            this.getStepsCount = function () {
                if (stepsCount)
                    return stepsCount;
                else
                    throw new IllegalStateException('stepsCount is not initialized');
            };

            /**
             * Loads step's setting file
             * @param callback {function} callback to call after loading
             */
            var loadStepsSettings = function (callback) {
                $.ajax({
                    url: SETTINGS_PATH,
                    dataType: "JSON"
                }).done(function (data) {
                    LOGGER.info('Settings data loaded...');
                    settings = data;
                    stepsCount = settings.length;
                    LOGGER.debug(settings);
                    if (typeof(callback) === "function")
                        callback();
                }).fail(function (jqxhr, settings, exception) {
                    throw new IllegalAsyncStateException(exception);
                });
            };

            /**
             * Loads step's script file and executing it.
             *
             * Every step's script should contain function expressing named the same with step.
             * Firstly, stepClass.preDispatch() method runs. It can be with/without callback.
             * This method goes first and usually is used to perform async things before step will be displayed;
             *
             * Than goes stepClass.mustache() method. This method should return an view object for
             * replacement.
             * This method usually is used to bind data from stepClass and application view
             *
             * The latest is stepClass.postDispatch(). This method goes last and executes after rendering
             * step is performed. It's great for binding events. It executes in {@link loadStep} method.
             *
             * @param step  {String} name of step
             * @param callback {function} callback to call after loading script file
             */
            var getStepScript = function (step, callback) {
                var view = {};
                if (!settings[step]['hasScript']) {
                    LOGGER.info('Step <' + step + '> doesn\'t have own script');
                    callback(view);
                    return;
                }
                $.getScript(SCRIPTS_PATH + settings[step]['filename'] + '.js')
                    .done(function (script) {
                        if (settings[step]['score'] === 0) {
                            _Scorer.addScore(0);
                        }
                        LOGGER.info('Step\'s script loaded...');
                        var stepJSObject = window[settings[step]['filename']];
                        LOGGER.debug(stepJSObject);
                        if (typeof (stepJSObject) === "function") {
                            var instance = new stepJSObject();
                            var mergeView = function () {
                                var mustache = instance.mustache();
                                if (typeof(mustache) === "object")
                                    view = mustache;
                            };
                            if (typeof instance.preDispatch === "function") {
                                if (instance.preDispatch.length > 0) {
                                    instance.preDispatch(function () {
                                        mergeView();
                                        callback(view, instance);
                                    });
                                    return;
                                } else {
                                    instance.preDispatch();
                                }
                            }
                            mergeView();
                        }
                        callback(view, instance);
                    }).fail(function (jqxhr, settings, exception) {
                    throw new IllegalAsyncStateException(exception);
                });
            };

            /**
             * Loads html template of a step
             * @param step {String} step's name
             * @param callback {function} callback to call after loading html file
             */
            var getStepData = function (step, callback) {
                $.get(STEP_PATH + settings[step]['filename'] + '.html')
                    .done(function (data) {
                        LOGGER.info('Step loaded...');
                        data = '<div data-step="' + step + '" class="step">' + data + '</div>';
                        LOGGER.debug(data);
                        callback(data);
                    }).fail(function (jqxhr, settings, exception) {
                    throw new IllegalAsyncStateException(exception);
                });
            };

            /**
             * This method is an union of several methods, that performs the whole cycle of loading step
             * @param step {Number} name of step
             * @param callback {function} callback to call after loading step
             */
            var loadStep = function (step, callback) {
                if (!settings || settings.length === 0)
                    throw new IllegalStateException('Step\'s settings haven\'t been loaded yet or is empty');
                _Cogwheel.setText('Loading step').show();
                getStepData(step, function (html) {

                    TEMPLATETOR.setTemplate(html);
                    getStepScript(step, function (mustache, scriptInstance) {
                        var data = TEMPLATETOR.extendView(mustache).render();
                        lastLoadedStep = step;
                        toStepSpace(data);
                        LOGGER.debug(scriptInstance);
                        if (scriptInstance && typeof scriptInstance.postDispatch === "function")
                            scriptInstance.postDispatch();
                        if (PRODUCTION && step >= settings.length)
                            _Service.pushResults();
                        if (typeof(callback) === "function")
                            callback(data, scriptInstance);
                    });
                });
            };

            /**
             * Methods allows you to navigate through already loaded steps.
             * @param id {Number} index of a step
             * @param callback {function} callback to call after changing step
             */
            var fadeStepIn = function (id, callback) {
                if (id >= settings.length)
                    throw new IllegalStateException('Step <' + id + '> is not loaded');
                _BreadCrumb.setBreadCrumbStepNames(id + 1);
                _ProgressBar.changeProgressBarState(Rotator.getStepsCount(), id + 1);
                var old = stepSpace.find('div[data-step="' + visibleStep + '"]');
                if (old.is(':visible')) {
                    old.slideToggle().promise()
                        .done(function () {
                            old.removeClass('current');
                        });
                } else
                    old.removeClass('current');

                var current = stepSpace.find('div.step[data-step="' + id + '"]');
                current.slideToggle().promise()
                    .done(function () {
                        current.addClass('current');
                        visibleStep = id;
                        _Cogwheel.hide();
                        if (typeof(callback) === "function")
                            callback();
                    });
            };

            /**
             * Allows to switch step by id, it it's loaded
             * @param step {Number} step's id
             */
            this.switchStep = function (step) {
                fadeStepIn(step, function () {
                    if (visibleStep < lastLoadedStep)
                        self.enableNextButton();
                    else
                        self.disableNextButton();

                    if (visibleStep > 0)
                        self.enablePrevButton();
                    else
                        self.disablePrevButton();
                });
            };

            /**
             * Gets a max score for this step
             * @param step {Number} step's index
             * @returns {Numeric} amount of points for this step
             */
            this.getStepScore = function (step) {
                if ($.isNumeric(step) && step < settings.length)
                    return settings[step]['score'];
                else
                    return settings[visibleStep]['score'];
            };

            /**
             * Gets a max score for next step
             * @param step {Number} step's index
             * @returns {Numeric} amount of points for this step
             */
            this.getNextStepScore = function (step) {
                if ($.isNumeric(step) && step < settings.length)
                    return settings[step]['score'];
                else
                    return settings[visibleStep + 1]['score'];
            };

            /**
             * Gets an array of scores for each step
             * @returns {Array} of scores
             */
            this.getAllStepScores = function () {
                var scores = [];
                var totalSteps = Object.keys(settings).length;
                for (var i = 0; i < totalSteps; i++)
                    scores.push(settings[i].score);
                return scores;
            };

            /**
             * Gets an array of step names for each step
             * @returns {Array} of step names
             */
            this.getAllStepNames = function () {
                var names = [];
                var totalSteps = Object.keys(settings).length;
                for (var i = 0; i < totalSteps; i++)
                    names.push(settings[i].filename);
                return names;
            };

            /**
             * Performs transition to the next level
             * @param callback {function} callback to call after changing step
             * @returns {boolean} true, if the transition was successful, otherwise - false
             */
            this.nextStep = function (callback) {
                var next = visibleStep + 1;
                if (next >= settings.length)
                    throw new IllegalStateException('No next step');
                LOGGER.debug("LAST: " + lastLoadedStep + "; NEXT: " + next);
                if (next > lastLoadedStep) {
                    loadStep(next, function () {
                        fadeStepIn(next, function () {
                            _StepInvoker.invoke();
                            if (typeof callback == "function")
                                callback();
                        });
                    });
                } else {
                    fadeStepIn(next, callback);
                }
                next >= lastLoadedStep ? this.disableNextButton() : this.enableNextButton();
                this.enablePrevButton();

                $('div.validation-alert-success').fadeOut();
                $('div.validation-alert-danger').fadeOut();
                window.scrollTo(0,0);
                return true;
            };

            /**
             *Performs transition to the results after clicking 'End trainer' button
             */
            this.nextResults = function (callback) {
                var nextR = this.getStepsCount() - 1;
                if (nextR > settings.length)
                    throw new IllegalStateException('No next step');
                LOGGER.debug("LAST: " + lastLoadedStep + "; NEXT: " + nextR);
                if (nextR > lastLoadedStep) {
                    loadStep(nextR, function () {
                        fadeStepIn(nextR, function () {
                            _StepInvoker.invoke();
                            if (typeof callback == "function")
                                callback();
                        });
                    });
                } else {
                    fadeStepIn(nextR, callback);
                }
                nextR >= lastLoadedStep ? this.disableNextButton() : this.enableNextButton();
                this.enablePrevButton();

                $('div.validation-alert-success').fadeOut();
                $('div.validation-alert-danger').fadeOut();
                return true;
            };

            /**
             * Performs transition to the prev level
             * @param callback {function} callback to call after changing step
             */
            this.prevStep = function (callback) {
                var prev = visibleStep - 1;
                if (prev < 0 || prev > lastLoadedStep)
                    throw new IllegalStateException("Bad previous step: " + prev);
                fadeStepIn(prev, callback);
                this.enableNextButton();

                if (prev <= 0)
                    this.disablePrevButton();
            };

            /**
             * Gets current step's index
             * @returns {number} id of a step
             */
            this.currentStepId = function () {
                return visibleStep;
            };

            /**
             * Gets last loaded step's index
             * @returns {number} id of a last step
             */
            this.lastLoadedStepId = function () {
                return lastLoadedStep;
            };

            /**
             * Factory method for preloading first step
             * @param callback {function} callback to call after loading step
             */
            this.init = function (callback) {
                loadStepsSettings(function () {
                    loadStep(0, function () {
                        fadeStepIn(0, callback);
                        self.disablePrevButton();
                    });
                });
            };
        });
})(jQuery, Logger, Templatetor, Scorer, Service, StepInvoker, Cogwheel, BreadCrumb, ProgressBar);


//----------------------------VALIDATOR PART-----------------------------------------------------
var Validator = null;

(function ($, _Logger, _Rotator, _Scorer, _Templatetor) {
    /**
     * Validator is a class for checking fields and forms in trainer.
     *
     * Current version of validator has 2 modes: strict and non-strict mode.
     * Non-strict mode ignores amount of user's attempts and allows the user to go to the next step
     * as soon as all fields are written correctly.
     *
     * In strict mode, Validator monitors the number of attempts and allows to go to next level
     * if the number of attempts is 0 (in this case the number of points for this step decreases) or if
     * everything was entered correctly.
     * @constructor
     */
    Validator =
        (function () {
            var LOGGER = new _Logger();

            var fulfilled = false;
            var targets = [];

            var isStrict = false;
            var attempts = 3;
            var ignoreCase = true;

            var penalty = 0.5;
            var currentMaxScore = _Rotator.getNextStepScore();
            var dab = false;
            var esfa = false;
            /**
             * Sets a strict mode for Validator
             * @param b {Boolean} strict mode switch
             * @returns {Validator} current object (flow)
             */
            this.setStrictMode = function (b) {
                if (typeof b !== "boolean")
                    throw new IllegalArgumentException("Mode switch should be boolean");
                isStrict = b;
                return this;
            };

            /**
             * Switch for case sensitivity of validator
             * @param b {Boolean} sensitivity mode switch
             * @returns {Validator} current object (flow)
             */
            this.setIgnoreCase = function (b) {
                if (typeof b !== "boolean")
                    throw new IllegalArgumentException("Case sensitivity switch should be boolean");
                ignoreCase = b;
                return this;
            };

            /**
             * Sets an amount of attempts in strict mode, that user can use to write a correct answer.
             * @param a {number} amount of attempts
             * @returns {Validator} current object (flow)
             */
            this.setAttempts = function (a) {
                if (typeof a !== "number" || a <= 0)
                    throw new IllegalArgumentException("Amount of attempts should be a number greater then zero");
                attempts = a;
                return this;
            };

            /**
             * Gets an amount of attempts in strict mode.
             * @returns {Validator} current object (flow)
             */
            this.getAttempts = function () {
                if (typeof attempts !== "number")
                    throw new IllegalArgumentException("Amount of attempts should be a number");
                return attempts;
            };

            /**
             * Sets an amount of attempts in strict mode, that user can use to write a correct answer.
             * @param a {number} amount of attempts
             * @returns {Validator} current object (flow)
             */
            this.setAttemptsOnCheckButton = function (b) {
                if (typeof b !== "object")
                    throw new IllegalArgumentException("Check button should be an object");

                var result = '{{CHECK}} ({{ATTEMPTS_LEFT}}' + (attempts - 1 >= 0 ? attempts - 1 : 0) + ')';
                if (_Templatetor.templatable(result))
                    result = new _Templatetor().setTemplate(result).render();
                b.html(result);
            };

            /**
             * Sets penalty for each failed try in strict mode.
             * @param p {number} penalty size
             * @returns {Validator} current object (flow)
             */
            this.setPenalty = function (p) {
                if (typeof p !== "number" || p <= 0)
                    throw new IllegalArgumentException("Penalty size should be a number greater then zero");
                penalty = p;
                return this;
            };

            /**
             * Gets penalty.
             * @returns {Validator} current object (flow)
             */
            this.getPenalty = function () {
                if (typeof penalty !== "number" || penalty <= 0)
                    throw new IllegalArgumentException("Penalty should be a number greater then zero");
                return penalty;
            };

            /**
             * Fixes radio buttons adding value to them so validator can read them properly.
             */
            this.fixRadio = function (o) {
                var checked = $(':radio[name="' + o + '"]').filter(":checked").attr('values');
                $('input[name="' + o + '"]').attr('value', checked);
            };

            /**
             * Fixes checkboxes adding value to them so validator can read them properly.
             * Second param - whether you want the non-checked state of checkbox to be a correct answer.
             */
            this.fixCheckbox = function (o, n) {
                if (n) checked = $(':input[name="' + o + '"]').not(":checked").attr('values');
                else checked = $(':input[name="' + o + '"]').filter(":checked").attr('values');
                $('input[name="' + o + '"]').attr('value', checked);
            };

            /**
             * Disables backlighting of correct/uncorrect answers in the current step.
             */
            this.disableAnswersBacklight = function (b) {
                if (typeof b !== "boolean")
                    throw new IllegalArgumentException("Disabling answers backlighting trigger should be boolean");
                dab = b;
                return this;
            };

            /**
             * Enables alert popup after success/fail to do a step
             */
            this.enableStepFinishAlert = function (b) {
                if (typeof b !== "boolean")
                    throw new IllegalArgumentException("Enabling step finish alert trigger should be boolean");
                esfa = b;
                return this;
            };

            /**
             * Adds an object to observe by the Validator.
             * @param o {jQuery} wrapped DOM element where to get value to check
             * @param v {Array|*} correct values of element's value. It can be an array of values or only one value;
             * @param multiple {Boolean} check it, if you want validator to explode your element's value and check separately
             * @returns {Validator} current object (flow)
             */
            this.addValidator = function (o, v, multicorrect, multiple) {
                LOGGER.debug('VALIDATOR ADDED:', o, v, multicorrect, multiple);
                if (!(o instanceof $))
                    throw new IllegalArgumentException('Object ' + o.val() + ' should be an instance of $');
                else if (o.length == 0)
                    throw new IllegalArgumentException('DOM Element ' + o.selector + " doesn't exist. Validator not added");

                if (typeof(v) === 'function') {
                }
                else if (!$.isArray(v)) {
                    v = [v + ''];
                } else {
                    for (var i in v)
                        v[i] = v[i] + '';
                }
                targets.push([o, v, !!multicorrect, !!multiple]);
                return this;
            };

            /**
             * Method validates all Validator's observables.
             */
            this.validate = function () {
                LOGGER.debug("CHECKING VALIDATOR:", targets);
                if (isStrict)
                    LOGGER.debug("SCRIPT MODE VALIDATION");
                if (fulfilled === true)
                    throw new IllegalStateException('I ended up here. Stop clicking validate!');
                else if ($.isEmptyObject(targets))
                    throw new IllegalStateException('Targets are empty, nothing to check');
                else if (attempts <= 0)
                    throw new IllegalStateException('No attempts left. Go next level.');

                LOGGER.debug("----------- FOR LOOP ------------- ");
                var checkState = true,
                    invalidTargets = 0;
                for (var i = 0; i < targets.length; i++) {
                    var target = targets[i][0];
                    var currentValue = '';
                    if (target.attr("type") === "radio") {
                        target.parent().siblings().each(function () {
                            var radioVal = $(this).find('input[type=radio]:checked').val();
                            if (radioVal !== undefined) currentValue = radioVal;
                        });
                    }
                    else if (target.attr("type") === "checkbox") {
                        if (target.is(":checked")) {
                            currentValue = 'true';
                        } else {
                            currentValue = 'false';
                        }
                    }
                    else {
                        currentValue = (target.val() ? target.val() : target.attr("value")) + '';
                    }
                    currentValue = currentValue.replace(/,(\d+)$/, '.$1');

                    var correctValues = targets[i][1];
                    var isValid = true;
                    if (typeof(correctValues) === 'function') {
                        LOGGER.debug("# VALIDATING TARGET WITH FUNCTION <" + target.selector + ">:", "Current value:", currentValue);
                        isValid = correctValues(currentValue);
                    }
                    else {
                        if (ignoreCase) {
                            currentValue = currentValue.toLowerCase();
                            for (var k in correctValues)
                                correctValues[k] = correctValues[k].toLowerCase();
                        }
                        if (targets[i][2] && !targets[i][3]) currentValue = currentValue.split(',');
                        else if (targets[i][3]) currentValue = currentValue.split(',');
                        else currentValue = [currentValue];

                        if (!currentValue && isStrict === false) {
                            checkState = false;
                            continue;
                        }
                        LOGGER.debug("# VALIDATING TARGET <" + target.selector + ">:", "Current value:", currentValue, "Correct values:", correctValues);
                        if (targets[i][3] && currentValue.length != correctValues.length)
                            isValid = false;
                        else {
                            for (var j = 0; j < currentValue.length; j++) {
                                if ($.inArray(currentValue[j], correctValues) == -1)
                                    isValid = false;
                            }
                        }
                    }
                    LOGGER.debug(target, target.prev());
                    if (isValid) {
                        LOGGER.debug('Target is good', target, 'target.val = ' + currentValue, 'correctValues:', correctValues);
                        if (!dab) {
                            $('* [for="' + target.attr('name') + '"]').removeClass('has-error').addClass('has-success');
                        }

                    } else {
                        LOGGER.debug('Target is wrong', target, 'target.val = ' + currentValue, 'correctValues:', correctValues);
                        if (!dab)
                            $('* [for="' + target.attr('name') + '"]').removeClass('has-success').addClass('has-error');
                        invalidTargets++;
                        checkState = false;
                    }
                }
                LOGGER.debug("----------- FOR LOOP END ------------- ");
                if (checkState === true) {
                    _Rotator.enableNextButton();
                    _Scorer.addScore(Math.round(currentMaxScore));
                    fulfilled = true;
                    if (esfa) $('div.validation-alert-success').fadeIn();
                } else {
                    if (isStrict === true) {
                        attempts--;
                        currentMaxScore -= penalty;
                    }
                    _Rotator.disableNextButton();
                    if (attempts <= 0) {
                        LOGGER.debug("NO attempts left");
                        _Rotator.enableNextButton();
                        var stepScore = currentMaxScore;
                        var totalElements = targets.length;
                        var scoreOfOne = stepScore / totalElements;
                        var score = stepScore - scoreOfOne * invalidTargets;
                        _Scorer.addScore(Math.round(score));
                        fulfilled = true;
                        if (esfa) $('div.validation-alert-danger').fadeIn();
                        return;
                    }

                }
                return checkState;
            };
            /*
                Calculating score on step, where "Finish trainer" button clicked
            */
            setScoreOnPushResults = function () {
                fulfilled = false;
                LOGGER.debug("CHECKING VALIDATOR:", targets);
                if (isStrict)
                    LOGGER.debug("SCRIPT MODE VALIDATION");
                if (fulfilled === true)
                    throw new IllegalStateException('I ended up here. Stop clicking validate!');
                else if ($.isEmptyObject(targets))
                    throw new IllegalStateException('Targets are empty, nothing to check');
                else if (attempts <= 0)
                    throw new IllegalStateException('No attempts left. Go next level.');

                LOGGER.debug("----------- FOR LOOP ------------- ");
                var checkState = true,
                    invalidTargets = 0;
                for (var i = 0; i < targets.length; i++) {
                    var target = targets[i][0];
                    var currentValue = '';
                    if (target.attr("type") === "radio") {
                        target.parent().siblings().each(function () {
                            var radioVal = $(this).find('input[type=radio]:checked').val();
                            if (radioVal !== undefined) currentValue = radioVal;
                        });
                    }
                    else if (target.attr("type") === "checkbox") {
                        if (target.is(":checked")) {
                            currentValue = 'true';
                        } else {
                            currentValue = 'false';
                        }
                    }
                    else {
                        currentValue = (target.val() ? target.val() : target.attr("value")) + '';
                    }
                    currentValue = currentValue.replace(/,(\d+)$/, '.$1');

                    var correctValues = targets[i][1];
                    var isValid = true;
                    if (typeof(correctValues) === 'function') {
                        LOGGER.debug("# VALIDATING TARGET WITH FUNCTION <" + target.selector + ">:", "Current value:", currentValue);
                        isValid = correctValues(currentValue);
                    }
                    else {
                        if (ignoreCase) {
                            currentValue = currentValue.toLowerCase();
                            for (var k in correctValues)
                                correctValues[k] = correctValues[k].toLowerCase();
                        }
                        if (targets[i][2] && !targets[i][3]) currentValue = currentValue.split(',');
                        else if (targets[i][3]) currentValue = currentValue.split(',');
                        else currentValue = [currentValue];

                        if (!currentValue && isStrict === false) {
                            checkState = false;
                            continue;
                        }
                        LOGGER.debug("# VALIDATING TARGET <" + target.selector + ">:", "Current value:", currentValue, "Correct values:", correctValues);
                        if (targets[i][3] && currentValue.length != correctValues.length)
                            isValid = false;
                        else {
                            for (var j = 0; j < currentValue.length; j++) {
                                if ($.inArray(currentValue[j], correctValues) == -1)
                                    isValid = false;
                            }
                        }
                    }
                    LOGGER.debug(target, target.prev());
                    if (isValid) {
                        LOGGER.debug('Target is good', target, 'target.val = ' + currentValue, 'correctValues:', correctValues);
                        if (!dab) {
                            $('* [for="' + target.attr('name') + '"]').removeClass('has-error').addClass('has-success');
                        }

                    } else {
                        LOGGER.debug('Target is wrong', target, 'target.val = ' + currentValue, 'correctValues:', correctValues);
                        if (!dab)
                            $('* [for="' + target.attr('name') + '"]').removeClass('has-success').addClass('has-error');
                        invalidTargets++;
                        checkState = false;
                    }
                }

                var stepScore = currentMaxScore;
                var totalElements = targets.length;
                var scoreOfOne = stepScore / totalElements;
                var score = stepScore - scoreOfOne * invalidTargets;
                return score;
            };
        });
})(jQuery, Logger, Rotator, Scorer, Templatetor);