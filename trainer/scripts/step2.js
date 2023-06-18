var VStep2;// A variable for future validator
var step2 = function () {
    this.preDispatch = function () {
        
    };

    this.postDispatch = function () {
        VStep2 = new Validator();
        //first param - DOM object, second - correct value or array of values, third - if there are multiple correct answers
        //fourth - if you need to have 2 answers at the same time to be entered
        VStep2.addValidator($('select[name="step2-select"]'), 2)
            .setStrictMode(true) // Restrict number of attempts to 3 (default)
            .setIgnoreCase(false) // Ignore letter case (eg. TEXT, text)
            .enableStepFinishAlert(true); // Enable showing alert after step is done
            //.disableAnswersBacklight(true); //-- Disable green/red color of correct/incorrect answers

        $('.page2 button.check').click(function () {
            VStep2.setAttemptsOnCheckButton($(this)); //dynamically changing amount of attempts left on check button
            VStep2.validate(); // validate the validators
        });
    };

    this.mustache = function () {
        return {
            STEP2_SELECT: new Select('step2-select')
                .addOption('{{ELEMENTSTEST_OPTION_ONE}}', 0)
                .addOption('{{ELEMENTSTEST_OPTION_TWO}}', 1)
                .addOption('{{ELEMENTSTEST_OPTION_THREE}}', 2)
                //.randomize() -- You can randomize select choice elements
                .render()
        }
    }
};