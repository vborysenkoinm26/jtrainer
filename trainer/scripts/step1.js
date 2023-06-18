var VStep1;// A variable for future validator
var step1 = function () {
    var plot = null;
    this.preDispatch = function (callback) {
        var w = new WolframAlpha(); // Making a call to wolfram api to build a plot
        w.setQuery('3x^2+2x+5').plot(function (data) {
            plot = '<img src="' + data + '">';
            callback();
        });
        //Making a call to LateX to generate an image of formula
        step1_latex = null;
        step1_latex = new LateX();
        step1_latex.setFormula("G_{\\mu \\nu }=8\\pi G(T_{\\mu \\nu}+\\rho _{\\Lambda }g_{\\mu \\nu})");
    };

    this.postDispatch = function () {
        VStep1 = new Validator();
        //first param - DOM object, second - correct value or array of values, third - if there are multiple correct answers
        //fourth - if you need to have 2 answers at the same time to be entered
        VStep1.addValidator($('select[name="step1-select"]'), 2)
            .addValidator($('input[name="step1-textinput"]'), ['test', 'Text'], false, true) //It means user is required to enter both 'test' and 'text' separated by comas. They will be validated separately
            .addValidator($('div.droppable[name="step1-droppable"]'), ['one', 'four'], false, true) //<----- Please, don't use numbers as values if you want multiple answers at same time
            .addValidator($('input[name="step1-input1"]'), ['1', '4'], true, false) // It means 1 and 4 will be correct
            .addValidator($('input[name="step1-radios"]'), 'fourr')
            .addValidator($('input[name="step1-input"]'), 4.5) // Either 4.5 and 4,5 will be correct
            .addValidator($('input[name="step1-checkbox1"]'), true)
            .addValidator($('input[name="step1-checkbox2"]'), false)
            .setStrictMode(true) // Restrict number of attempts to 3 (default)
            .setIgnoreCase(false) // Ignore letter case (eg. TEXT, text)
            .enableStepFinishAlert(true); // Enable showing alert after step is done
            //.disableAnswersBacklight(true); //-- Disable green/red color of correct/incorrect answers

        $('.page1 button.check').click(function () {
            VStep1.setAttemptsOnCheckButton($(this)); //dynamically changing amount of attempts left on check button
            VStep1.validate(); // validate the validators
        });
    };

    this.mustache = function () {
        return {
            STEP1_SELECT: new Select('step1-select')
                .addOption('{{ELEMENTSTEST_OPTION_ONE}}', 0)
                .addOption('{{ELEMENTSTEST_OPTION_TWO}}', 1)
                .addOption('{{ELEMENTSTEST_OPTION_THREE}}', 2)
                //.randomize() -- You can randomize select choice elements
                .render(),
            STEP1_DROPPABLE: new DroppableArea('step1-droppable')
                .addClass('input')
                .render(),
            STEP1_DRAGGABLE: new DraggableGroup('step1-draggable')
                .addClass('value')
                .addOption('Answer 1', 'one')
                .addOption('Answer 2', 'two')
                .addOption('Answer 3', 'three')
                .addOption('Answer 4', 'four')
                .randomize() // You can randomize draggable elements
                .render(),
            STEP1_INPUT1: new TextInput('step1-input1')
                .render(),
            STEP1_TEXTINPUT: new TextInput('step1-textinput')
                .render(),
            STEP1_RADIOS: new Radios('step1-radios')
                .addRadio('{{RADIO_TEXT_1}}', 'onee')
                .addRadio('{{RADIO_TEXT_2}}', 'twoo')
                .addRadio('{{RADIO_TEXT_3}}', 'threee')
                .addRadio('{{RADIO_TEXT_4}}', 'fourr')
                .randomize() // You can randomize radio elements
                .render(),
            STEP1_INPUT: new TextInput('step1-input')
                .render(),
            STEP1_CHECKBOX1: new CheckBox('step1-checkbox1')
                .setValue("ch1")
                .setLabel('{{{CHECKBOX1}}}')
                .render(),
            STEP1_CHECKBOX2: new CheckBox('step1-checkbox2')
                .setValue("ch2")
                .setLabel('{{{CHECKBOX2}}}')
                .render(),
            PLOT: plot,
            STEP1_LATEX: step1_latex != null ? step1_latex.render() : ""
        }
    }
};