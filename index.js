/*global d3, SunCalc*/

const sunchart = () => {
  var dates = doys(2015);
  var lat = 51;
  var lon = -114;

  var doy_data = dates.map(d => SunCalc.getTimes(d, lat, lon));

  var sundata = Object.keys(doy_data[0]).map(key => ({
    name: key,
    values: doy_data.map(d => d[key])
  }));
};

const timeFloat = d => {
  var e = new Date(d);
  return d - e.setHours(0, 0, 0, 0);
};

const doys = year => {
  var dates = [];
  for (let day = 1; day <= 365; day++) {
    var date = new Date(year, 0);
    dates.push(new Date(date.setDate(day)));
  }
  return dates;
};
