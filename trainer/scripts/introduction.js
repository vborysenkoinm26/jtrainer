var introduction = function () {
    this.preDispatch = function () {
      variant = Math.floor(Math.random()*(10))+1;
      variants = [
        [3, 5, 9, 2, 7],
        [9, 4, 5, 10, 8],
        [8, 3, 10, 7, 9],
        [1, 7, 6, 8, 5],
        [5, 6, 7, 9, 3],
        [4, 8, 1, 10, 6],
        [2, 1, 5, 4, 3],
        [4, 5, 1, 3, 9],
        [4, 5, 7, 8, 2],
        [3, 8, 6, 2, 9]
      ]

      var optimizedBubbleSort = function(arr) {
        var len = arr.length;
        var swapped;
        var steps = 0;
        var arrCopy = arr.slice();
        var hints = [];
      
        do {
          swapped = false;
          for (var i = 0; i < len - 1; i++) {
            if (arrCopy[i] > arrCopy[i + 1]) {
              hints.push({
                "state": arrCopy.slice(),
                "swap": i,
              });

              var temp = arrCopy[i];
              arrCopy[i] = arrCopy[i + 1];
              arrCopy[i + 1] = temp;
              steps++;
              swapped = true;
            }
          }
          len--;
        } while (swapped);
      
        console.log(steps);
        return hints;
      }
      
      // Sort the randomList
      hints = optimizedBubbleSort(variants[variant]);
      console.log(hints);
    };

    this.postDispatch = function () {
      $('div.flag-icon').each(function() {
        $(this).attr('onclick', 'window.location.href = \'?lang=\' + $(this).attr("id")');
      });
    };

    this.mustache = function () {
      return {
        STEPS_COUNT: Rotator.getStepsCount() - 2
		  }
    }
};