var VStep4;// A variable for future validator
var step4 = function () {
    this.preDispatch = function () {
    };

    this.postDispatch = function () {

        VStep4 = new Validator();
        //first param - DOM object, second - correct value or array of values, third - if there are multiple correct answers
        //fourth - if you need to have 2 answers at the same time to be entered
        VStep4.addValidator($('div.droppable[name="step4-droppable"]'), ['e' + hints[3].swap, 'e' + (hints[3].swap + 1)], false, true) //<----- Please, don't use numbers as values if you want multiple answers at same time
            .setStrictMode(true) // Restrict number of attempts to 3 (default)
            .setIgnoreCase(false) // Ignore letter case (eg. TEXT, text)
            .enableStepFinishAlert(true); // Enable showing alert after step is done

        $('.page4 button.check').click(function () {
            VStep4.setAttemptsOnCheckButton($(this)); //dynamically changing amount of attempts left on check button
            VStep4.validate(); // validate the validators
        });
    };

    this.mustache = function () {
        return {
            STEP4_DROPPABLE: new DroppableArea('step4-droppable')
                .addClass('input')
                .render(),
            STEP4_DRAGGABLE: new DraggableGroup('step4-draggable')
                .addClass('value')
                .addOption(hints[3].state[0], "e0")
                .addOption(hints[3].state[1], "e1")
                .addOption(hints[3].state[2], "e2")
                .addOption(hints[3].state[3], "e3")
                .addOption(hints[3].state[4], "e4")
                .render(),
        }
    }
};