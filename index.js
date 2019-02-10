/*global d3, SunCalc*/

const sunchart = () => {
    const lat = 51;
    const lon = -114;
    const year = 2015;

    var data = days(2015).map(d => SunCalc.getTimes(d, lat, lon));

    // The order is important
    var keep = ["nightEnd", "sunrise", "dusk", "night"];

    var sundata = keep.map((key, i) => (
        {name: key, order: i,
         values: data.map((d, j) => {
             return {
                 value: standardize(d[key], year, j)
             };
         })}
    ));

    sundata = sundata.map((d, i, arr) => {
        d.values = d.values.map((f, j) => {

            let options = d3.keys(arr).map(d => arr[d].values[j].value);
            options = options.filter(d => d < f.value);
            f.previous = options.length === 0 ?
                new Date(year, 0, 1) :
                new Date(Math.max(...options));
            return f;
        });
        return d;
    });

    var svg = d3.select("svg"),
        width = +svg.attr("width"),
        height = +svg.attr("height"),
        padding = 100;

    var y = d3.scaleTime()
        .domain([new Date(year, 0, 1), new Date(year, 0, 2)])
        // .nice(d3.timeDay, 1)
        .rangeRound([height - padding, padding]);

    var x = d3.scaleLinear()
        .domain([0, 364])
        .rangeRound([padding, width - padding * 2]);

    var xAxis = d3.axisBottom().scale(x).ticks(10);
    var yAxis = d3.axisLeft().scale(y).ticks(5).tickFormat(d3.timeFormat("%I %p"));

    svg.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + (height - padding) + ")")
	.call(xAxis);

    svg.append("g")
	.attr("class", "y axis")
	.attr("transform", "translate(" + padding + ", 0)")
	.call(yAxis);

    var colors = d3.scaleOrdinal()
        .domain(keep)
        .range(d3.schemeSet2);

    var area = d3.area()
        .x((d, i) => x(i))
        .y0(d => y(d.value))
        .y1(d => y(d.previous))
        .curve(d3.curveStep);

    svg.append('g')
        .selectAll('path')
        .data(sundata).enter()
        .append("path")
        .attr("class", "area")
        .attr("id", d => d.name)
        .attr('d', d => area(d.values))
        .style('fill', d => colors(d.name))
        .style('opacity', .5);

    return sundata;
};

const standardize = (date, year, i) => {
    if (isNaN(date.getTime())) {
        return new Date(year, 0, 1);
    } else {
        return new Date(date.setFullYear(year, 0, 1));
    }
};

const days = year => {
    var dates = [];
    for (let day = 1; day <= 365; day++) {
        var date = new Date(year, 0);
        dates.push(new Date(date.setDate(day)));
    }
    return dates;
};
