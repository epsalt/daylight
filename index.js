/*global d3, moment, SunCalc*/

const sunchart = () => {
    const lat = 51;
    const lon = -114;
    const tz = "America/Edmonton";
    const year = 2015;

    var svg = d3.select("svg"),
        width = +svg.attr("width"),
        height = +svg.attr("height"),
        padding = 100;

    // Contours
    var n = 30,
        mpd = 1440,
        days = 365;

    var m = moment.tz(tz).year(year).month(0).date(1);
    var data = new Array();

    for (let i = 0; i < days; i++) {
        for (let j = 0; j < 24; j++) {
            for (let k = 0; k < 60/n; k++) {
                m.hours(j).minutes(k * n);
                var alt = SunCalc.getPosition(m.clone(), lat, lon).altitude * (180/Math.PI);
                data[i * 24 * (60/n) + j * (60/n) + k] =  alt;
            }
        }
        m.add(1, 'days');
    };

    const projection = d3.geoTransform({
        point: function(x, y) {
            let nx = padding + y * ((width - 2 * padding) / days);
            let ny = height - padding -  x * ((height - 2 * padding) / (mpd/n));
            this.stream.point(nx, ny);
        }
    });

    var thresholds = [-90, -18, -12, -6, 0];

    var contours = d3.contours()
        .size([mpd/n, days])
        .thresholds(thresholds)(data);

    // Scales
    var y = d3.scaleTime()
        .domain([new Date(year, 0, 1), new Date(year, 0, 2)])
        .nice(d3.timeDay, 1)
        .rangeRound([height - padding, padding])
        .clamp(true);

    var x = d3.scaleTime()
        .domain([new Date(year, 0, 1), new Date(year, 11, 31)])
        .rangeRound([padding, width - padding]);

    var xAxis = d3.axisBottom()
        .scale(x)
        .ticks(d3.timeMonth)
        .tickSize(16, 0)
        .tickFormat(d3.timeFormat("%b"));

    var yAxis = d3.axisLeft()
        .scale(y)
        .ticks(5)
        .tickFormat(d3.timeFormat("%I %p"));

    var color = d3.scaleLinear()
        .domain(d3.extent(thresholds))
        .interpolate(d => d3.interpolateCubehelixDefault);

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
	.call(xAxis)
        .selectAll(".tick text")
        .style("text-anchor", "start")
        .attr("x", 6)
        .attr("y", 6);

    svg.append("g")
	.attr("class", "y axis")
	.attr("transform", "translate(" + padding + ", 0)")
	.call(yAxis);

};
