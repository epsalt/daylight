/*global d3, moment, L, SunCalc*/

const map = (updateSunchart) => {
  const osmUrl = "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const osmAttrib = '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  const osm = L.tileLayer(osmUrl, {maxZoom: 18, attribution: osmAttrib});
  const momentAttrib = '<a href="https://momentjs.com/timezone/">Moment Timezone</a>';

  const bounds = new L.LatLngBounds(
    new L.LatLng(-80, -180),
    new L.LatLng(75, 180));

  const leafletMap = L.map('map', {
    center: bounds.getCenter(),
    zoom: 1,
    layers: [osm],
    noWrap: true,
    minZoom: 1,
    maxBounds: bounds,
    maxBoundsViscosity: 0.80
  });

  d3.json("https://raw.githubusercontent.com/moment/moment-timezone/develop/data/meta/2020a.json")
    .then(tz => {

      const zones = d3.entries(tz.zones).map(d => (
        L.circleMarker([d.value.lat, d.value.long],
          {title: d.key, radius: 3, weight: 1, interactive: false,
            attribution: momentAttrib})
              .addTo(leafletMap)
              .bindTooltip(d.key, {permanent: true})
              .closeTooltip()
      ));

      var current = zones.find(e => (e.options.title === "Atlantic/Madeira"));
      var frozen = false;

      current
        .openTooltip()
        .setStyle({color: "#f44271"});

      const mouseMove = e => {
        let point = L.GeometryUtil.closestLayer(leafletMap, zones, e.latlng).layer;

        if(point !=  current) {
          current
            .closeTooltip()
            .setStyle({color: "#3388ff"});

          point
            .openTooltip()
            .setStyle({color: "#f44271"});

          let latlng = point.getLatLng();
          updateSunchart(latlng.lat, latlng.lng, point.options.title);

          current = point;
        }
      };

      const click = e => {
        frozen = !frozen;
        (frozen) ? leafletMap.off('mousemove') : leafletMap.on('mousemove', mouseMove);
        mouseMove(e);
      };

      const dragStart = e => {
        leafletMap.off('mousemove');
      };

      const dragEnd = e => {
        leafletMap.on('mousemove', mouseMove);
      };

      leafletMap.on('mousemove', mouseMove);
      leafletMap.on('click', click);
      leafletMap.on('dragstart', dragStart);
      leafletMap.on('dragend' , dragEnd);

    });
};

const sunContours = (lat, long, tz, year, resolution, thresholds) => {
  const m = moment.utc().year(year).month(0).date(1).startOf('day');
  const daysInYear = moment([year]).isLeapYear() ? 366 : 365;
  const minutesPerDay = 1440;
  const data = new Array();
  const zone = moment.tz.zone(tz);

  for (let i = 0; i < (daysInYear * minutesPerDay / resolution); i++) {
    let val = m.valueOf() + zone.parse(m) * 60000;
    data[i] = SunCalc.getPosition(val, lat, long).altitude * (180/Math.PI);
    m.add(resolution, 'minutes');
  }

  const contours = d3.contours()
    .size([minutesPerDay / resolution, daysInYear])
    .thresholds(thresholds)(data);

  const dstLines = zone.untils.filter(d => {
    return (d > new Date(year, 0, 1)) && (d < new Date(year, 11, 31));
  });

  return [contours, dstLines];
};

const sunChart = (lat, lon, tz, year, resolution = 60) => {
  const margin = {top: 10, right: 0, bottom: 20, left: 40};
  const width =  550 - margin.left - margin.right;
  const height = 275 - margin.top - margin.bottom;

  const svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const daysInYear = moment([year]).isLeapYear() ? 366 : 365;
  const minutesPerDay = 1440;

  const projection = d3.geoTransform({
    point: function(x, y) {
      let nx = y * (width / daysInYear);
      let ny = height - x * (height / (minutesPerDay / resolution));
      this.stream.point(nx, ny);
    }
  });

  const thresholds = [-90, -18, -12, -6, 0];
  const colors = ["#808080", "#A0A6B6", "#B4C5D6", "#CBDEE5", "#E6EEF1"];
  const labels = ["Night", "Astronomical Twilight", "Nautical Twilight", "Civil Twilight", "Day"];

  var [contours, dstLines] = sunContours(lat, lon, tz, year, resolution, thresholds);

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

  svg.append("g")
    .attr("class", "contours")
    .selectAll("path")
    .data(contours)
    .enter().append("path")
    .attr("id", d => "g-" + d.value)
    .attr("d", d3.geoPath(projection))
    .style("fill", (d, i) => colors[i]);

  svg.append("g")
    .attr("class", "lines")
    .selectAll("line")
    .data(dstLines)
    .enter().append("line")
    .attr('x1', d => x(d))
    .attr('y1', height)
    .attr('x2', d => x(d))
    .attr('y2', 0)
    .style("stroke-width", 2)
    .style("stroke", "#ccc")
    .style("fill", "none");

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .selectAll(".tick text")
    .style("text-anchor", "start")
    .attr("x", 3)
    .attr("y", 6);

  svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(0, 0)")
    .call(yAxis);

  const legendData = thresholds.map((d, i) => (
    {label: labels[i], threshold: d, color: colors[i]})
  );

  const legendPadding = 7;
  const legendCols = 3;

  // Legend code from https://stackoverflow.com/a/52256345
  const legend = d3.select("#legend").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("transform", "translate(" + margin.left + "," + margin.top/2 + ")")
    .attr("height", (width >= 510) ? 50 : 65)
    .selectAll("g")
    .data(legendData)
    .enter()
    .append("g");

  legend.append('rect')
    .attr('fill', d => d.color)
    .attr('height', 15)
    .attr('width', 15);

  legend.append('text')
    .attr('x', 18)
    .attr('y', 10)
    .attr('dy', '.15em')
    .text(d => d.label)
    .style('text-anchor', 'start')
    .style('font-size', 13);

  legend.attr('transform', (d, i, arr) => (
    "translate(" +
      (d3.max(legend.nodes().map(j => j.getBBox().width)) + legendPadding * 2) *
      Math.floor(i / (arr.length / legendCols)) +
      "," +
      (legend.nodes()[i].getBBox().height + legendPadding) *
      (i % Math.ceil(arr.length / legendCols)) +
      ")"
  ));

  const update = (lat, lon, tz) => {
    [contours, dstLines] = sunContours(lat, lon, tz, year, resolution, thresholds);

    svg.selectAll("path")
      .data(contours)
      .attr("d", d3.geoPath(projection));

    var lines = svg.select(".lines")
      .selectAll("line")
      .data(dstLines);

    lines
      .attr('x1', d => x(d))
      .attr('x2', d => x(d))
      .attr('y1', height)
      .attr('y2', 0);

    lines.exit().remove();

    lines.enter().append("line")
      .attr('x1', d => x(d))
      .attr('x2', d => x(d))
      .attr('y1', height)
      .attr('y2', 0)
      .style("stroke-width", 2)
      .style("stroke", "#ccc")
      .style("fill", "none");

  };

  return update;
};

{
  const init  = {
    loc: "Atlantic/Madeira",
    lat: 32.6333,
    lon: -15.1,
    year: new Date().getFullYear()
  };

  const updateSunchart = sunChart(init.lat, init.lon, init.loc, init.year);
  map(updateSunchart);
}
