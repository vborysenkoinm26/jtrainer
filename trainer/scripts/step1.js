var VStep1;// A variable for future validator
var step1 = function () {
    this.preDispatch = function () {
    };

    this.postDispatch = function () {

        VStep1 = new Validator();
        //first param - DOM object, second - correct value or array of values, third - if there are multiple correct answers
        //fourth - if you need to have 2 answers at the same time to be entered
        VStep1.addValidator($('div.droppable[name="step1-droppable"]'), ['e' + hints[0].swap, 'e' + (hints[0].swap + 1)], false, true) //<----- Please, don't use numbers as values if you want multiple answers at same time
            .setStrictMode(true) // Restrict number of attempts to 3 (default)
            .setIgnoreCase(false) // Ignore letter case (eg. TEXT, text)
            .enableStepFinishAlert(true); // Enable showing alert after step is done

        $('.page1 button.check').click(function () {
            VStep1.setAttemptsOnCheckButton($(this)); //dynamically changing amount of attempts left on check button
            VStep1.validate(); // validate the validators
        });
    };

    this.mustache = function () {
        return {
            STEP1_DROPPABLE: new DroppableArea('step1-droppable')
                .addClass('input')
                .render(),
            STEP1_DRAGGABLE: new DraggableGroup('step1-draggable')
                .addClass('value')
                .addOption(hints[0].state[0], "e0")
                .addOption(hints[0].state[1], "e1")
                .addOption(hints[0].state[2], "e2")
                .addOption(hints[0].state[3], "e3")
                .addOption(hints[0].state[4], "e4")
                .render(),
        }
    }
};