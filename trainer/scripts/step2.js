var VStep2;// A variable for future validator
var step2 = function () {
    this.preDispatch = function () {
    };

    this.postDispatch = function () {

        VStep2 = new Validator();
        //first param - DOM object, second - correct value or array of values, third - if there are multiple correct answers
        //fourth - if you need to have 2 answers at the same time to be entered
        VStep2.addValidator($('div.droppable[name="step2-droppable"]'), ['e' + hints[1].swap, 'e' + (hints[1].swap + 1)], false, true) //<----- Please, don't use numbers as values if you want multiple answers at same time
            .setStrictMode(true) // Restrict number of attempts to 3 (default)
            .setIgnoreCase(false) // Ignore letter case (eg. TEXT, text)
            .enableStepFinishAlert(true); // Enable showing alert after step is done

        $('.page2 button.check').click(function () {
            VStep2.setAttemptsOnCheckButton($(this)); //dynamically changing amount of attempts left on check button
            VStep2.validate(); // validate the validators
        });
    };

    this.mustache = function () {
        return {
            STEP2_DROPPABLE: new DroppableArea('step2-droppable')
                .addClass('input')
                .render(),
            STEP2_DRAGGABLE: new DraggableGroup('step2-draggable')
                .addClass('value')
                .addOption(hints[1].state[0], "e0")
                .addOption(hints[1].state[1], "e1")
                .addOption(hints[1].state[2], "e2")
                .addOption(hints[1].state[3], "e3")
                .addOption(hints[1].state[4], "e4")
                .render(),
        }
    }
};