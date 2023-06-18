var VStep3;// A variable for future validator
var step3 = function () {
    this.preDispatch = function () {
    };

    this.postDispatch = function () {

        VStep3 = new Validator();
        //first param - DOM object, second - correct value or array of values, third - if there are multiple correct answers
        //fourth - if you need to have 2 answers at the same time to be entered
        VStep3.addValidator($('div.droppable[name="step3-droppable"]'), ['e' + hints[2].swap, 'e' + (hints[2].swap + 1)], false, true) //<----- Please, don't use numbers as values if you want multiple answers at same time
            .setStrictMode(true) // Restrict number of attempts to 3 (default)
            .setIgnoreCase(false) // Ignore letter case (eg. TEXT, text)
            .enableStepFinishAlert(true); // Enable showing alert after step is done

        $('.page3 button.check').click(function () {
            VStep3.setAttemptsOnCheckButton($(this)); //dynamically changing amount of attempts left on check button
            VStep3.validate(); // validate the validators
        });
    };

    this.mustache = function () {
        return {
            STEP3_DROPPABLE: new DroppableArea('step3-droppable')
                .addClass('input')
                .render(),
            STEP3_DRAGGABLE: new DraggableGroup('step3-draggable')
                .addClass('value')
                .addOption(hints[2].state[0], "e0")
                .addOption(hints[2].state[1], "e1")
                .addOption(hints[2].state[2], "e2")
                .addOption(hints[2].state[3], "e3")
                .addOption(hints[2].state[4], "e4")
                .render(),
        }
    }
};