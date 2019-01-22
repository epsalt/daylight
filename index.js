/*global d3, SunCalc*/

const sunchart = () => {
    var dates = doys(2015);
    var lat = 51;
    var lon = -114;

    var doy_data = dates.map(d => SunCalc.getTimes(d, lat, lon));

    var sundata = Object.keys(doy_data[0]).map(key => ({
        name: key,
        values: doy_data.map(d => standardize(d[key]))
    }));

    var categories = sundata.map(d => d.name);

    var svg = d3.select("svg"),
        width = +svg.attr("width"),
        height = +svg.attr("height"),
        padding = 100;

    var y = d3.scaleTime()
        .domain([new Date(2000, 0, 1), new Date(2000, 0, 2)])
        .nice(d3.timeDay, 1)
        .rangeRound([height - padding, padding]);

    var x = d3.scaleLinear()
        .domain([0, 364])
        .rangeRound([padding, width - padding * 2]);

    var xAxis = d3.axisBottom().scale(x).ticks(10);
    var yAxis = d3.axisLeft().scale(y).ticks(5).tickFormat(d3.timeFormat("%I %p"));

    //x axis
    svg.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + (height - padding) + ")")
	.call(xAxis);

    //y axis
    svg.append("g")
	.attr("class", "y axis")
	.attr("transform", "translate(" + padding + ", 0)")
	.call(yAxis);

    var line = d3.line()
        .x((d, i) => x(i))
        .y(d => y(d))
        .curve(d3.curveStep);

    var colors = d3.scaleOrdinal()
        .domain(categories)
        .range(d3.schemeSet2);

    svg.selectAll(".line")
        .data(sundata).enter()
          .append("path")
          .attr("class", "line")
          .attr("d", d =>  line(d.values))
          .style("stroke", d => colors(d.name))
          .attr("id", d => d.name)
          .style("fill-opacity", 0);
};

const standardize = date => {
    let d = new Date(date.setFullYear(2000, 0, 1));
    return d;
};

const doys = year => {
    var dates = [];
    for (let day = 1; day <= 365; day++) {
        var date = new Date(year, 0);
        dates.push(new Date(date.setDate(day)));
    }
    return dates;
};
