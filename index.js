/*global d3, moment, topojson, SunCalc*/

const map = (updateSunchart, initLoc) => {
    const margin = {top: 50, right: 50, bottom: 50, left: 50},
          width = 500 - margin.left - margin.top,
          height = 250 - margin.top - margin.bottom;

    const svg = d3.select(".map").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const projection = d3.geoEquirectangular()
          .translate([width / 2, height / 2])
          .scale(75);

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

            var frozen = false;

            const mouseover = d => {
                if (!frozen) {
                    d3.selectAll(`circle`).attr("fill", "darkgreen");

                    d3.select(`circle#zone${d.value.id}`)
                        .attr("fill", "red");

                    focus
                        .attr("class", (d.value.long > 90) ? "focus right" : "focus left")
                        .text(d.key)
                        .attr("transform", "translate(" + projection([d.value.long, d.value.lat])[0] + "," + projection([d.value.long, d.value.lat])[1] + ")");

                    updateSunchart(d.value.lat, d.value.long, d.key);
                }
            };

            const click = d => {
                frozen = !frozen;

                if (!frozen) {
                    d3.selectAll(`circle`)
                        .attr("fill", "darkgreen");
                    mouseover(d);
                }
            };

            svg.append("g")
                .attr("class", "countries")
                .append("path")
                .attr("d", path(topojson.feature(world, world.objects.countries)))
                .attr("fill", "#ccc")
                .attr("stroke", "white");

            svg.append("g")
                .attr("class", "border")
                .append("path")
                .attr("d", path(({type: "Sphere"})))
                .attr("stroke", "#000")
                .attr("fill", "none");

            svg.append("g")
                .attr("class", "points")
                .selectAll("circle")
                .data(zones)
                .enter()
                .append("circle")
                .attr("r", 2)
                .attr("cx", d => projection([d.value.long, d.value.lat])[0])
                .attr("cy", d => projection([d.value.long, d.value.lat])[1])
                .attr("fill", "darkgreen")
                .attr("opacity", 0.5)
                .attr("id", d => `zone${d.value.id}`);

            const focus = svg.append("g")
                  .attr("transform",  "translate(0,-5)")
                  .attr("class", "focus")
                  .append("text");

            svg.append("g")
                .attr("class", "voronoi")
                .selectAll("path")
                .data(zones)
                .enter()
                .append("path")
                .attr("d", (d, i) => voronoi.renderCell(i))
                .attr("fill", "none")
                .attr("pointer-events", "all")
                .on("mouseover", mouseover)
                .on("click", click);

            const init = zones.map(d => d.key).indexOf(initLoc);
            mouseover(zones[init]);
        });

};

const sunContours = (lat, long, tz, year, resolution, thresholds) => {

    const m = moment.utc().year(year).month(0).date(1).startOf('day'),
          daysInYear = moment([year]).isLeapYear() ? 366 : 365,
          minutesPerDay = 1440,
          data = new Array(),
          zone = moment.tz.zone(tz);

    for (let i = 0; i < (daysInYear * minutesPerDay / resolution); i++) {
        let val = m.valueOf() + zone.parse(m) * 60000;
        data[i] = SunCalc.getPosition(val, lat, long).altitude * (180/Math.PI);
        m.add(resolution, 'minutes');
    }

    const contours = d3.contours()
          .size([minutesPerDay / resolution, daysInYear])
          .thresholds(thresholds)(data);

    return contours;
};

const sunChart = (lat, lon, tz, year, resolution = 60) => {

    const margin = {top: 20, right: 50, bottom: 20, left: 50},
          width = 500 - margin.left - margin.top,
          height = 250 - margin.top - margin.bottom;

    const svg = d3.select(".chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const daysInYear = moment([year]).isLeapYear() ? 366 : 365,
          minutesPerDay = 1440;

    const projection = d3.geoTransform({
        point: function(x, y) {
            let nx = y * (width / daysInYear);
            let ny = height - x * (height / (minutesPerDay / resolution));
            this.stream.point(nx, ny);
        }
    });

    const thresholds = [-90, -18, -12, -6, 0];
    var contours = sunContours(lat, lon, tz, year, resolution, thresholds);

    const y = d3.scaleTime()
        .domain([new Date(year, 0, 1), new Date(year, 0, 2)])
        .nice(d3.timeDay, 1)
        .rangeRound([height, 0])
        .clamp(true);

    const x = d3.scaleTime()
        .domain([new Date(year, 0, 1), new Date(year, 11, 31)])
        .rangeRound([0, width]);

    const xAxis = d3.axisBottom()
        .scale(x)
        .ticks(d3.timeMonth)
        .tickSize(16, 0)
        .tickFormat(d3.timeFormat("%b"));

    const yAxis = d3.axisLeft()
        .scale(y)
        .ticks(5)
        .tickFormat(d3.timeFormat("%I %p"));

    const color = d3.scaleLinear()
          .domain(d3.extent(thresholds))
          .interpolate(d => d3.interpolateCubehelixDefault);

    svg.append("g")
        .attr("class", "contours")
        .selectAll("path")
        .data(contours)
        .enter().append("path")
        .attr("id", d => "g-" + d.value)
        .attr("d", d3.geoPath(projection))
        .style("fill", d => color(d.value))
        .style("opacity", 0.5);

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

    const update = (lat, lon, tz) => {
        contours = sunContours(lat, lon, tz, year, resolution, thresholds);

        svg.selectAll("path")
            .data(contours)
            .attr("d", d3.geoPath(projection));

    };

    return update;

};

const main = () => {
    const init = {loc: "America/Edmonton",
                  lat: 53.55,
                  lon: -112.5333,
                  year: new Date().getFullYear()};

    const updateSunchart = sunChart(init.lat, init.lon, init.loc, init.year);
    map(updateSunchart, init.loc);
};
