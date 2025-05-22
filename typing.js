// typing.js

document.addEventListener('DOMContentLoaded', () => {
  const meds = [
    { name: 'Levadopa',   file: 'data/levadopa_events.csv' },
    { name: 'DA',         file: 'data/da_events.csv'       },
    { name: 'MAOB',       file: 'data/maob_events.csv'     },
    { name: 'Other',      file: 'data/other_events.csv'    },
    { name: 'No Med',     file: 'data/nomed_events.csv'    }
  ];

  const metrics = ['Hold', 'Latency'];
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const container = d3.select('#viz5-container');
  const svg = d3.select('#viz5-svg');
  const tooltip5 = d3.select('#tooltip5');

  let width  = parseInt(svg.style('width'))  - margin.left - margin.right;
  let height = parseInt(svg.style('height')) - margin.top  - margin.bottom;

  // Create a group for the plot
  const g = svg
    .attr('width',  width  + margin.left + margin.right)
    .attr('height', height + margin.top  + margin.bottom)
    .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

  // Scales & axes placeholders
  const xScale = d3.scaleBand().domain(meds.map(d => d.name)).padding(0.4);
  const yScale = d3.scaleLinear();
  const xAxisG = g.append('g').attr('transform', `translate(0,${height})`);
  const yAxisG = g.append('g');

  // Load all CSVs, tagging each row with its medication group
  Promise.all(
    meds.map(m =>
      d3.csv(m.file, d => ({
        medication: m.name,
        Hand:      d.Hand,
        Hold:      +d.Hold,
        Direction: d.Direction,
        Latency:   +d.Latency,
        Flight:    +d.Flight
      }))
    )
  ).then(datasets => {
    // flatten into one array
    const data = datasets.flat();

    // initial draw
    drawBoxplot('Hold');

    // dropdown interaction
    d3.select('#metric-select').on('change', function() {
      drawBoxplot(this.value);
    });

    function drawBoxplot(metric) {
      // 1) Compute summary stats per group
      const stats = meds.map(m => {
        const values = data
          .filter(d => d.medication === m.name)
          .map(d => d[metric])
          .sort(d3.ascending);

        const q1 = d3.quantile(values, 0.25);
        const median = d3.quantile(values, 0.5);
        const q3 = d3.quantile(values, 0.75);
        const iqr = q3 - q1;
        const min = d3.max([d3.min(values), q1 - 1.5 * iqr]);
        const max = d3.min([d3.max(values), q3 + 1.5 * iqr]);

        return { medication: m.name, values, q1, median, q3, iqr, min, max };
      });

      // 2) Update scales
      xScale.range([0, width]);
      yScale.domain([
        d3.min(stats, d => d.min),
        d3.max(stats, d => d.max)
      ]).nice()
      .range([height, 0]);

      // 3) Render axes
      xAxisG.call(d3.axisBottom(xScale));
      yAxisG.call(d3.axisLeft(yScale));

      // 4) DATA JOIN for each medication group
      const groups = g.selectAll('.boxplot-group')
        .data(stats, d => d.medication);

      // EXIT old groups
      groups.exit().remove();

      // ENTER new groups
      const groupsEnter = groups.enter()
        .append('g')
          .attr('class', 'boxplot-group')
          .attr('transform', d => `translate(${xScale(d.medication)},0)`);

      // 5) Draw whiskers
      groupsEnter.append('line')
        .attr('class', 'whisker top')
        .attr('x1', xScale.bandwidth()/2)
        .attr('x2', xScale.bandwidth()/2);

      groupsEnter.append('line')
        .attr('class', 'whisker bottom')
        .attr('x1', xScale.bandwidth()/2)
        .attr('x2', xScale.bandwidth()/2);

      // 6) Draw box
      groupsEnter.append('rect')
        .attr('class', 'box')
        .attr('x', 0)
        .attr('width', xScale.bandwidth());

      // 7) Draw median line
      groupsEnter.append('line')
        .attr('class', 'median')
        .attr('x1', 0)
        .attr('x2', xScale.bandwidth());

      // 8) TOOLTIP overlay
      groupsEnter.append('rect')
        .attr('class', 'hitbox')
        .attr('x', 0)
        .attr('width', xScale.bandwidth())
        .attr('height', height)
        .attr('fill', 'transparent')
        .on('mousemove', (event, d) => {
          tooltip5.style('opacity', 1)
            .html(`
              <strong>${d.medication}</strong><br>
              ${metric} stats:<br>
              Min: ${d.min.toFixed(1)}<br>
              Q1:  ${d.q1.toFixed(1)}<br>
              Med: ${d.median.toFixed(1)}<br>
              Q3:  ${d.q3.toFixed(1)}<br>
              Max: ${d.max.toFixed(1)}
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top',  (event.pageY - 28) + 'px');
        })
        .on('mouseout', () => tooltip5.style('opacity', 0));

      // 9) MERGE & UPDATE positions
      const allGroups = groupsEnter.merge(groups);
      allGroups.select('rect.box')
        .transition().duration(500)
          .attr('y',    d => yScale(d.q3))
          .attr('height', d => yScale(d.q1) - yScale(d.q3));

      allGroups.select('line.median')
        .transition().duration(500)
          .attr('y1', d => yScale(d.median))
          .attr('y2', d => yScale(d.median));

      allGroups.select('line.whisker.top')
        .transition().duration(500)
          .attr('y1', d => yScale(d.max))
          .attr('y2', d => yScale(d.q3));

      allGroups.select('line.whisker.bottom')
        .transition().duration(500)
          .attr('y1', d => yScale(d.min))
          .attr('y2', d => yScale(d.q1));

      // Center whisker x
      allGroups.selectAll('line.whisker')
        .attr('x1', xScale.bandwidth()/2)
        .attr('x2', xScale.bandwidth()/2);
    }
  })
  .catch(err => console.error('Error loading CSVs:', err));
});

// VISUALIZATION 6 ----------------------------------------------------

// typing.js
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

document.addEventListener('DOMContentLoaded', () => {
  const meds = [
    { name: 'Levadopa', file: 'data/levadopa_events.csv' },
    { name: 'DA',       file: 'data/da_events.csv'       },
    { name: 'MAOB',     file: 'data/maob_events.csv'     },
    { name: 'Other',    file: 'data/other_events.csv'    },
    { name: 'No Med',   file: 'data/nomed_events.csv'    }
  ];

  // Load all CSVs once
  Promise.all(
    meds.map(m =>
      d3.csv(m.file, d => ({
        medication: m.name,
        Hold:   +d.Hold,
        Flight: +d.Flight
      }))
    )
  ).then(datasets => {
    const data = datasets.flat();

    const button = d3.select('#big-button');
    const tooltip6 = d3.select('#tooltip6');
    let tempo = +d3.select('#tempo-slider').property('value');
    let currentEvents = [];
    let stopSignal = false;  // to break playback if user switches meds

    // Update tempo display
    d3.select('#tempo-slider').on('input', function() {
      tempo = +this.value;
      d3.select('#tempo-value').text(tempo + '×');
    });

    // Med button clicks
    d3.selectAll('.med-btn').on('click', function() {
      // Stop any existing playback
      stopSignal = true;

      // Highlight active
      d3.selectAll('.med-btn').classed('active', false);
      d3.select(this).classed('active', true);

      // Filter events for this medication
      const medName = d3.select(this).attr('data-med');
      currentEvents = data.filter(d => d.medication === medName);

      // start playback after a tiny delay
      stopSignal = false;
      d3.timeout(() => playEvents(0), 100);
    });

    // Recursive playback function
    function playEvents(i) {
      if (stopSignal || i >= currentEvents.length) return;
      const ev = currentEvents[i];
      const holdDur = ev.Hold / tempo;
      const gapDur  = ev.Flight / tempo;

      // animate “press”
      button
        .transition()
        .duration(holdDur)
        .style('transform', 'scale(0.8)')
        .on('end', () => {
          // animate “release”
          button
            .transition()
            .duration(50)
            .style('transform', 'scale(1)')
            .on('end', () => {
              // tooltip on each press
              const [x, y] = d3.pointer(ev);
              tooltip6
                .style('opacity', 1)
                .html(`Hold: ${ev.Hold.toFixed(1)} ms<br>Flight: ${ev.Flight.toFixed(1)} ms`)
                .style('left',  (window.innerWidth/2 - 50) + 'px')   // center it horizontally
                .style('top',   (button.node().getBoundingClientRect().bottom + 145) + 'px'); // below the button

              // hide tooltip after a bit
            //   d3.timeout(() => tooltip.style('opacity', 0), 500);

              // schedule next
              d3.timeout(() => playEvents(i + 1), gapDur);
            });
        });
    }
  })
  .catch(err => console.error(err));
});
