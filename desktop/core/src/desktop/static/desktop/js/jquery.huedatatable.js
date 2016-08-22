// Licensed to Cloudera, Inc. under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  Cloudera, Inc. licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/*
 * Extension to datatable to programmatically switch off datatable in case of huge tables
 *
 */
(function ($, window, document) {

  $.fn.hueDataTable = function (oInit) {

    var self = this;
    self.$table = null;

    self.fnSetColumnVis = function (index, visible) {
      var aoColumns = self.$table.data('aoColumns');
      var change = aoColumns[index].bVisible !== visible;
      aoColumns[index].bVisible = visible;
      if (!change) {
        return;
      }
      if (!visible) {
        self.$table.find('tr').find('td:eq(' + index + '),th:eq(' + index + ')').hide();
      } else {
        self.$table.find('tr').find('td:eq(' + index + '),th:eq(' + index + ')').show();
      }
      self.$table.data('plugin_jHueTableExtender').drawLockedRows(true);
    }

    self.fnToggleAllCols = function (visible) {
      var aoColumns = self.$table.data('aoColumns');
      aoColumns.forEach(function (col, idx) {
        if (idx > 0) {
          col.bVisible = visible;
        }
      });
      if (!visible) {
        self.$table.find('th, td').hide();
        self.$table.find('tr').find('td:eq(0),th:eq(0)').show();
      } else {
        self.$table.find('th, td').show();
      }
      self.$table.data('plugin_jHueTableExtender').drawLockedRows(true);
    }

    self.fnSortColumn = function (obj, way) {
      var $t = self.$table;
      var data = self.$table.data('data');

      var idx = obj.originalIndex;
      if (way === 0) {
        idx = 0;
      }

      if (way === -1 || way === 0) {
        data.sort(function (a, b) {
          if (a[idx] > b[idx]) {
            return 1;
          }
          if (a[idx] < b[idx]) {
            return -1;
          }
          return 0;
        });
      }
      else {
        data.sort(function (a, b) {
          if (a[idx] > b[idx]) {
            return -1;
          }
          if (a[idx] < b[idx]) {
            return 1;
          }
          return 0;
        });
      }

      self.fnDraw(true);
    }

    self.fnShowSearch = function () {
      if ($('.hue-datatable-search').length == 0) {
        var search = $('<div>').css({
          'position': 'fixed',
          'bottom': '20px',
          'right': '70px',
          'opacity': 0.85
        }).addClass('hueAnchor hue-datatable-search').appendTo($('body'));
        search.html('<input type="text"> <i class="fa fa-chevron-down pointer muted"></i> <i class="fa fa-chevron-up pointer muted"></i> &nbsp; <span></span> &nbsp; <i class="fa fa-times"></i>');

        search.find('.fa-times').on('click', function () {
          search.hide();
        });

        search.find('.fa-chevron-down').on('click', function () {
          self.fnScrollToNextResult();
        });

        search.find('.fa-chevron-up').on('click', function () {
          self.fnScrollToPreviousResult();
        });

        search.find('input').jHueDelayedInput(function () {
          self.fnSearch(search.find('input').val());
        }, 300, true);

        search.find('input').keydown(function(e){
          if(e.keyCode == 13) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            search.find('.fa-chevron-down').trigger('click');
          }
        });

        search.find('input').focus();
      }
      else {
        $('.hue-datatable-search').show();
        $('.hue-datatable-search').find('input').focus();
      }
    }

    self.fnSearch = function (what, avoidScroll) {
      var $t = self.$table;
      $t.find('.columnSelected').removeClass('columnSelected');
      $t.data('scrollToCol', null);
      $t.data('scrollToRow', null);

      if (what !== '') {
        $('.hue-datatable-search').find('span').text('');
        $('.hue-datatable-search').find('.fa-chevron-down').addClass('muted');
        $('.hue-datatable-search').find('.fa-chevron-up').addClass('muted');
        var coords = [];
        $t.data('searchCoords', []);
        $t.data('searchCoordHighlighted', 0);
        var data = self.$table.data('data');
        data.forEach(function (row, rowIdx) {
          row.forEach(function (fld, fldIdx) {
            if ((fld + "").replace(/\&nbsp;/, ' ').toLowerCase().indexOf(what.toLowerCase()) > -1) {
              coords.push({
                row: rowIdx,
                col: fldIdx
              });
            }
          });
        });
        $t.data('searchCoords', coords);
        if (coords.length > 0) {
          if ($('.hue-datatable-search').find('input').val() !== '') {
            $('.hue-datatable-search').find('.fa-chevron-down').removeClass('muted');
            $('.hue-datatable-search').find('.fa-chevron-up').removeClass('muted');
          }
          if (typeof avoidScroll === 'undefined' || !avoidScroll) {
            self.fnScrollTo(coords[0].row, coords[0].col);
          }
          else {
            $('.hue-datatable-search').find('span').text(($t.data('searchCoordHighlighted') + 1) + ' ' + $t.data('oInit')['i18n'].OF + ' ' + $t.data('searchCoords').length);
          }
        }
        else {
          $('.hue-datatable-search').find('span').text($t.data('oInit')['i18n'].NO_RESULTS);
        }
      }
    };

    self.fnScrollToPreviousResult = function () {
      var $t = self.$table;
      if ($t.data('searchCoords').length > 0) {
        var high = $t.data('searchCoordHighlighted');
        high = high == 0 ? $t.data('searchCoords').length - 1 : high - 1;
        $t.data('searchCoordHighlighted', high);
        self.fnScrollTo($t.data('searchCoords')[high].row, $t.data('searchCoords')[high].col);
      }
    }

    self.fnScrollToNextResult = function () {
      var $t = self.$table;
      if ($t.data('searchCoords').length > 0) {
        var high = $t.data('searchCoordHighlighted');
        high = high == $t.data('searchCoords').length - 1 ? 0 : high + 1;
        $t.data('searchCoordHighlighted', high);
        self.fnScrollTo($t.data('searchCoords')[high].row, $t.data('searchCoords')[high].col);
      }
    }

    self.fnScrollTo = function (row, col) {
      var $t = self.$table;
      $('.hue-datatable-search').find('span').text(($t.data('searchCoordHighlighted') + 1) + ' ' + $t.data('oInit')['i18n'].OF + ' ' + $t.data('searchCoords').length);
      var colSel = $t.find("tr th:nth-child(" + (col + 1) + ")");
      $t.parent().animate({
        scrollLeft: colSel.position().left + $t.parent().scrollLeft() - $t.parent().offset().left - 30
      }, 300);
      try {
        $t.parents($t.data('oInit')['scrollable']).animate({
          scrollTop: $t.find('tbody tr').find('td:eq(0)').filter(function () {
            return $(this).text() == row
          }).position().top + 73
        });
      }
      catch (e) {
      }

      colSel = $t.find("tr td:nth-child(" + (col + 1) + ")");
      $t.data('scrollToCol', col);
      $t.data('scrollToRow', row);
      $t.data('scrollAnimate', true);
      $t.parent().trigger('scroll');
    }

    self.isDrawing = false;

    self.fnDraw = function (force) {
      if (!self.isDrawing) {

        self.isDrawing = true;
        var $t = self.$table;
        var aoColumns = self.$table.data('aoColumns');
        var data = self.$table.data('data');
        var appendable = $t.children('tbody').length > 0 ? $t.children('tbody') : $t;
        var startCol = -1;
        var endCol = -1;
        $t.find("thead>tr th").each(function (i) {
          if ($(this).position().left > 0 && startCol == -1) {
            startCol = i;
          }
          if ($(this).position().left < $t.parent().width() + $t.parent().position().left) {
            endCol = i;
          }
        });
        startCol = Math.max(1, startCol - 1);
        endCol = Math.min(aoColumns.length, endCol + 1);

        var rowHeight = 29;
        var invisibleOffset = $t.data('oInit')['forceInvisible'] ? $t.data('oInit')['forceInvisible'] : (aoColumns.length < 100 ? 10 : 1);
        var scrollable = $t.parents($t.data('oInit')['scrollable']);
        var visibleRows = Math.ceil((scrollable.height() - Math.max($t.offset().top, 0)) / rowHeight);
        if ($t.data('oInit')['contained']) {
          visibleRows = Math.ceil(scrollable.height() / rowHeight);
        }
        visibleRows += invisibleOffset;
        visibleRows = Math.max(visibleRows, 11);

        var startRow = $t.offset().top - 73 < 0 ? Math.max(Math.floor(Math.abs($t.offset().top - 73) / rowHeight) - invisibleOffset, 0) : 0;
        if ($t.data('oInit')['contained']) {
          startRow = Math.max(0, (Math.floor(Math.abs($t.position().top) / rowHeight)) - invisibleOffset);
        }
        var endRow = startRow + visibleRows + invisibleOffset;

        if (endRow != $t.data('endRow') || (endRow == $t.data('endRow') && endCol > $t.data('endCol')) || force) {
          $t.data('endCol', endCol);
          $t.data('endRow', endRow);

          if ($t.data('fnDraws') === 0) {
            var html = '';
            for (var i = 0; i < data.length; i++) {
              html += '<tr class="ht-visible-row ht-visible-row-' + i + '" style="height: 29px"><td>' + data[i][0] + '</td><td colspan="' + (aoColumns.length - 1) + '" class="stripe"></td></tr>';
            }
            appendable.html(html);
            if ($t.data('plugin_jHueTableExtender')) {
              $t.data('plugin_jHueTableExtender').drawFirstColumn();
            }
          }
          else {
            if (force) {
              var html = '';
              for (var i = $t.find('.ht-visible-row').length; i < data.length; i++) {
                html += '<tr class="ht-visible-row ht-visible-row-' + i + '"><td>' + data[i][0] + '</td><td colspan="' + (aoColumns.length - 1) + '" class="stripe"></td></tr>';
              }
              appendable.html(appendable.html() + html);
              if ($t.data('plugin_jHueTableExtender')) {
                $t.data('plugin_jHueTableExtender').drawFirstColumn();
              }
            }
          }

          for (var i = 0; i < data.length; i++) {
            var html = '';
            if (i >= startRow && i <= endRow) {
              var row = data[i];
              if (row) {
                for (var j = 0; j < endCol; j++) {
                  html += '<td ' + (!aoColumns[j].bVisible ? 'style="display: none"' : '') + '>' + row[j] + '</td>';
                }

                if (endCol < aoColumns.length) {
                  html += '<td colspan="' + (aoColumns.length - endCol) + '" class="stripe"></td>';
                }
              }
            }
            else {
              html = '<td>' + data[i][0] + '</td><td colspan="' + (aoColumns.length - 1) + '" class="stripe"></td>';
            }
            appendable.children().eq(i).html(html);
          }

          if ($t.data('scrollToCol')) {
            var colSel = $t.find("tr th:nth-child(" + ($t.data('scrollToCol') + 1) + ")");
            colSel = $t.find("tr td:nth-child(" + ($t.data('scrollToCol') + 1) + ")");
            if ($t.data('scrollAnimate')) {
              $t.parent().animate({
                scrollLeft: colSel.position().left + $t.parent().scrollLeft() - $t.parent().offset().left - 30
              }, 300);
              $t.data('scrollAnimate', null);
            }
            if ($t.data('scrollToRow') == null) {
              colSel.addClass("columnSelected");
            }
            else {
              $t.find("tr:nth-child(" + ($t.data('scrollToRow') + 1) + ") td:nth-child(" + ($t.data('scrollToCol') + 1) + ")").addClass('columnSelected');
            }
          }

          if ($t.data('plugin_jHueTableExtender')) {
            $t.data('plugin_jHueTableExtender').drawHeader(typeof force === 'undefined');
            $t.data('plugin_jHueTableExtender').drawLockedRows();
          }

          if (force) {
            $t.data('plugin_jHueTableExtender').drawFirstColumn();
            $t.data('plugin_jHueTableExtender').drawLockedRows();
          }

        }
        $t.data('fnDraws', $t.data('fnDraws') + 1);
        if ($t.data('oInit')['fnDrawCallback']) {
          $t.data('oInit')['fnDrawCallback']();
        }

        $t.trigger('headerpadding');

        self.isDrawing = false;
      }
    }

    self.fnAddData = function (mData, bRedraw) {
      var $t = self.$table;

      var aoColumns = $t.data('aoColumns') || [];
      $t.data('data', $t.data('data').concat(mData));

      if (mData.length === 0) {
        return;
      }

      if (aoColumns.length === 0) {
        mData[0].forEach(function () {
          aoColumns.push({
            bVisible: true
          })
        })
      }

      self.fnDraw(true);

      if ($('.hue-datatable-search').is(':visible')){
        self.fnSearch($('.hue-datatable-search').find('input').val(), true);
      }
    };

    self.fnSettings = function () {
      var aoColumns = self.$table.data('aoColumns');
      return {
        aoColumns: aoColumns
      }
    }

    self.fnClearTable = function (bRedraw) {
      var $t = self.$table;
      if ($t.children('tbody').length > 0) {
        $t.children('tbody').empty();
      }
      else {
        $t.children('tr').remove();
      }
      $t.data('data', []);
      $t.data('aoRows', []);
      $t.data('aoColumns', []);
      $t.data('fnDraws', 0);
    };

    self.fnDestroy = function () {
      self.fnClearTable();
      self.$table.unwrap();
      self.$table.removeClass('table-huedatatable');
    };

    return self.each(function () {
      self.$table = $(this);
      var parent = self.$table.parent();
      if (parent.hasClass('dataTables_wrapper')) {
        return;
      }
      $('.hue-datatable-search').remove();
      self.$table.data('data', []);
      self.$table.data('aoRows', []);
      self.$table.data('aoColumns', []);
      self.$table.data('fnDraws', 0);
      self.$table.wrap('<div class="dataTables_wrapper"></div>');

      self.$table.bind('sort', function (e, obj) {
        self.$table.find('thead tr th:not(:eq(' + obj.originalIndex + '))').removeClass('sorting_desc').removeClass('sorting_asc');
        var $cell = self.$table.find('thead tr th:eq(' + obj.originalIndex + ')');
        if ($cell.hasClass('sorting_desc')) {
          $cell.removeClass('sorting_desc');
          self.fnSortColumn(obj, 0);
        }
        else if ($cell.hasClass('sorting_asc')) {
          $cell.removeClass('sorting_asc').addClass('sorting_desc');
          self.fnSortColumn(obj, 1);
        }
        else {
          $cell.addClass('sorting_asc');
          self.fnSortColumn(obj, -1);
        }
      });

      if (typeof oInit !== 'undefined') {
        self.$table.data('oInit', oInit);
        var drawTimeout = -1;
        if (self.$table.data('oInit')['scrollable'] && !self.$table.data('isScrollAttached')) {
          self.$table.data('isScrollAttached', true);
          var scrollFn = function () {
            window.clearTimeout(drawTimeout);
            drawTimeout = window.setTimeout(self.fnDraw, Math.max(100, Math.min(self.$table.data('aoColumns').length, 500)));
          }
          self.$table.parents(oInit['scrollable']).data('scrollFnDt', scrollFn);
          self.$table.parents(oInit['scrollable']).on('scroll', scrollFn);
        }
      }
      self.$table.addClass('table-huedatatable');
    });
  };
})(jQuery, window, document);