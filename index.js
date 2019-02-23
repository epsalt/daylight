/*global d3, delaunay, moment, topojson, SunCalc*/

const map = updateSunchart => {
    const margin = {top: 50, right: 50, bottom: 50, left: 50};

    const width = 960 - margin.left - margin.top,
          height = 500 - margin.top - margin.bottom;

    const svg = d3.select(".map").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const projection = d3.geoEquirectangular()
          .translate([width / 2, height / 2]);

    const path = d3.geoPath()
          .projection(projection);

    Promise.all([
        d3.json("https://unpkg.com/world-atlas@1/world/110m.json"),
        d3.json("https://raw.githubusercontent.com/moment/moment-timezone/bf1de5d6a7cc6cb493d90b021fb2c0ac777c93eb/data/meta/latest.json")])
        .then(([world, tz]) => {

            const zones = d3.entries(tz.zones).map(
                (obj, i) => {
                    obj.value["id"] = i;
                    return obj;}
            );

            const points = d3.entries(tz.zones)
                  .map(d => projection([d.value.long, d.value.lat]));

            const voronoi = d3.Delaunay.from(points)
                  .voronoi([-margin.left, -margin.top, width + margin.right, height + margin.bottom]);

            const mouseover = d => {
                d3.selectAll(`circle#zone${d.value.id}`).attr("fill", "red");
                // Show zone name
            };

            const mouseout = d => {
                d3.selectAll(`circle#zone${d.value.id}`).attr("fill", "darkgreen");
            };

            const click = d => {
                updateSunchart(d.value.lat, d.value.long, d.value.name, d.key);
            };

            svg.append("path")
                .attr("d", path(topojson.feature(world, world.objects.countries)))
                .attr("fill", "#ccc")
                .attr("stroke", "white");

            svg.append("path")
                .attr("d", path(({type: "Sphere"})))
                .attr("stroke", "#000")
                .attr("fill", "none");

            svg.selectAll("path")
                .data(zones)
                .enter()
                .append("path")
                .attr("d", (d, i) => voronoi.renderCell(i))
                .attr("fill", "none")
                .attr("pointer-events", "all")
                .on("mouseover", mouseover)
                .on("mouseout", mouseout)
                .on("click", click);

            svg.selectAll("circle")
      	        .data(zones)
                .enter()
      	        .append("circle")
      	        .attr("r", 2)
      	        .attr("cx", d => projection([d.value.long, d.value.lat])[0])
                .attr("cy", d => projection([d.value.long, d.value.lat])[1])
      	        .attr("fill", "darkgreen")
      	        .attr("opacity", 0.5)
                .attr("id", d => `zone${d.value.id}`);
    });
};

const sunContours = (lat, long, location, tz, year, resolution, thresholds) => {

    const mpd = 1440,
          m = moment.tz(tz).year(year).month(0).date(1),
          data = new Array();


    for (let i = 0; i < 365; i++) {
        for (let j = 0; j < 24; j++) {
            for (let k = 0; k < 60/resolution; k++) {
                m.hours(j).minutes(k * resolution);
                var alt = SunCalc.getPosition(m.clone(), lat, long).altitude * (180/Math.PI);
                data[i * 24 * (60/resolution) + j * (60/resolution) + k] =  alt;
            }
        }
        m.add(1, 'days');
    };

    const contours = d3.contours()
          .size([1440 / resolution, 365])
          .thresholds(thresholds)(data);

    return contours;
};

const sunChart = (lat, lon, location, tz, year, resolution = 30) => {

    var text = [`Location: ${location}`, `Timezone: ${tz}`],
        thresholds = [-90, -18, -12, -6, 0];

    var margin = {top: 50, right: 50, bottom: 50, left: 50};

    var width = 960 - margin.left - margin.top,
        height = 500 - margin.top - margin.bottom;

    var svg = d3.select(".chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    const projection = d3.geoTransform({
        point: function(x, y) {
            let nx = y * (width / 365);
            let ny = height - x * (height / (1440 / resolution));
            this.stream.point(nx, ny);
        }
    });

    var contours = sunContours(lat, lon, location, tz, year, resolution, thresholds);

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
        .attr('class', 'annotation')
        .style('font-size', '15px')
        .style('font-weight', 300);


    const update = (lat, lon, location, tz) => {
        contours = sunContours(lat, lon, location, tz, year, resolution, thresholds);
        text = [`Location: ${location}`, `Timezone: ${tz}`];

        svg.selectAll("path")
            .data(contours)
            .attr('d', d3.geoPath(projection));

        svg.selectAll(".annotation")
            .data(text)
            .text(d => d);
        console.log(text);
    };

    return update;

};

const main = () => {
    const year = 2015,
          updateSunchart = sunChart(53.55, -112.5333, "America/Edmonton", "America/Edmonton", year);
    map(updateSunchart);
};
