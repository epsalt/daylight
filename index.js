/*global d3, moment, SunCalc*/

const sunchart = () => {
    var lat = 51,
        lon = -114,
        location = "Calgary",
        tz = "America/Edmonton",
        year = 2015;

    var text = [`Location: ${location}`, `Timezone: ${tz}`];

    var margin = {top: 50, right: 50, bottom: 50, left: 50};

    var width = 960 - margin.left - margin.top,
        height = 500 - margin.top - margin.bottom;

    var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

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
            let nx = y * (width / days);
            let ny = height - x * (height / (mpd / n));
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
        .rangeRound([height, 0])
        .clamp(true);

    var x = d3.scaleTime()
        .domain([new Date(year, 0, 1), new Date(year, 11, 31)])
        .rangeRound([0, width]);

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
	.attr("transform", "translate(0," + height + ")")
	.call(xAxis)
        .selectAll(".tick text")
        .style("text-anchor", "start")
        .attr("x", 6)
        .attr("y", 6);

    svg.append("g")
	.attr("class", "y axis")
	.attr("transform", "translate(0, 0)")
	.call(yAxis);

    svg.append('g')
        .selectAll('text')
        .data(text)
        .enter().append('text')
        .text(d => d)
        .attr('x', 15)
        .attr('y', (d, i) => -margin.top/2 + i * 17.5)
        .style('font-size', '15px')
        .style('font-weight', 300);

};
