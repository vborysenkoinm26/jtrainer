$.valHooks.div = {
    get: function (elem) {
        return $(elem).attr('value');
    },
    set: function (elem, value) {
        $(elem).attr('value', value);
    }
};

function makeDraggable(elementName) {
    $('div.draggables[name="' + elementName + '"] div.draggable').draggable({
        revert: true
    });
}

function makeDroppable(elementName) {
    $('div.droppable[name="' + elementName + '"]').droppable({
        drop: function (event, ui) {
            var parentSelector = ui.draggable.parent().attr('name');
            ui.draggable.attr('data-parent', parentSelector);
            ui.draggable.appendTo('div.droppable[name="' + elementName + '"]');
            ui.draggable.draggable("disable");
            ui.draggable.appendTo('div.droppable[name="' + elementName + '"]').removeAttr('style', '');
            var v = ($(this).val() || '');
            $(this).val(v + (v.length > 0 ? ',' : '') + ui.draggable.val());
            ui.draggable.click(function () {
                var parent = $(this).closest("div.droppable");
                var answerValue = $(this).val();
                var parentValue = parent.val();
                parent.val(parentValue.replace("," + answerValue, "").replace(answerValue + ",", "").replace(answerValue, ""));
                $(this).attr('style', 'position:relative').appendTo('div.draggables[name="' + parentSelector + '"]').draggable("enable").unbind('click');
            });
            $(this).trigger('drop:after');
        }});
}