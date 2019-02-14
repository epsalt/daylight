/*global d3, SunCalc*/

const sunchart = () => {
    const lat = -51;
    const lon = -114;
    const year = 2015;

    var svg = d3.select("svg"),
        width = +svg.attr("width"),
        height = +svg.attr("height"),
        padding = 100;

    // Contours
    var d = new Date(year, 0, 1),
        n = 30,
        mpd = 1440,
        days = 365;

    var data = new Array(mpd/n * days);

    for (let j = 0; j < days; ++j) {
        for (let i = 0; i < mpd/n; ++i) {
            data[j * (mpd/n) + i] = SunCalc.getPosition(d, lat, lon).altitude * 180 / Math.PI;
            d.setMinutes(d.getMinutes() + n);
        }
    }

    const projection = d3.geoTransform({
        point: function(x, y) {
            let nx = padding + y * ((width - 2 * padding) / days);
            let ny = padding + x * ((height - 2 * padding) / (mpd/n));
            this.stream.point(nx, ny);
        }
    });

    var thresholds = d3.range(-70, 50, 0.25);

    var contours = d3.contours()
        .size([mpd/n, days])
        .thresholds(thresholds)(data);

    // Scales
    var y = d3.scaleTime()
        .domain([new Date(year, 0, 1), new Date(year, 0, 2)])
        .nice(d3.timeDay, 1)
        .rangeRound([height - padding, padding])
        .clamp(true);

    var x = d3.scaleLinear()
        .domain([0, days,])
        .rangeRound([padding, width - padding]);

    var xAxis = d3.axisBottom().scale(x).ticks(10);
    var yAxis = d3.axisLeft().scale(y).ticks(5).tickFormat(d3.timeFormat("%I %p"));

    var color = d3.scaleLinear()
        .domain(d3.extent(thresholds))
        .interpolate(d => d3.interpolateMagma);

    // Data Binding
    svg.append('g')
        .selectAll('path')
        .data(contours)
        .enter().append('path')
        .attr('id', d => 'g-' + d.value)
        .attr('d', d3.geoPath(projection))
        .style('fill', (d, i) => color(d.value))
        .style('opacity', .5);

    svg.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + (height - padding) + ")")
	.call(xAxis);

    svg.append("g")
	.attr("class", "y axis")
	.attr("transform", "translate(" + padding + ", 0)")
	.call(yAxis);

};
