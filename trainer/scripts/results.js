var results = function () {

    this.preDispatch = function () {
        Scorer.end();
    };

    this.postDispatch = function () {
        /*var g = new GoogleCharts(); // Making a call to google charts api to build a column chart

        var scores = Rotator.getAllStepScores();
        var userScores = Scorer.getUserStepScores();

        var data = [
            ['Step', 'Step maximum', 'Your score'],
            ['Introduction', scores[0], userScores[0]],
            ['Step 1', scores[1], userScores[1]],
            ['Step 2', scores[2], userScores[2]],
            ['Results', scores[3], userScores[3]]
        ];

        var options = {
            chart: {
                title: 'Your results',
                subtitle: 'Step statistics for current trainer run'
            }
        };

        g.setType("bar");
        g.setLibrary("google.charts.Bar");
        g.setData(data);
        g.setOptions(options);
        g.doQuery($('div#gc'));
        */

        if (PRODUCTION)
            Service.pushResults();
    };

    this.mustache = function () {
        return {
            START_TIME: Scorer.getFormattedStartTime(),
            END_TIME: Scorer.getFormattedEndTime(),
            TIME_DIFF: Scorer.getTimeDifference(),
            SCORE: Scorer.getScore(),
            RESULTS_POINTS_IN_PERCENT: Scorer.getScoreInPercent()
        }
    }
};