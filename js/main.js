var projection = d3.geoMercator()
  .scale(9500)
  .center([-3.8, 52.4])
  .translate([270, 300])

var geoGenerator = d3.geoPath()
  .projection(projection);

var datasets = {}


// https://stackoverflow.com/questions/48719873/how-to-get-median-and-quartiles-percentiles-of-an-array-in-javascript-or-php
const quantile = (arr, q) => {
    const asc = arr => arr.sort((a, b) => a - b);
    const sorted = asc(arr);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
        return sorted[base];
    }
};

petition_fetched = function(pt_json){
  console.log(pt_json)

  var constituency_signature_counts = pt_json.data.attributes.signatures_by_constituency

  $("#petition_title").text(pt_json.data.attributes.action)

  document.title = pt_json.data.attributes.action + " - Senedd Petition by Constituency"


  var constituencies = datasets.electors

  _.each(constituencies, function(cnst){
    _.assign(cnst, _.find(constituency_signature_counts, {id:cnst.ConstituencyCode}))


    // The 2016 results data uses W07 codes instead of W09 for some reason
    _.assign(cnst, _.find(datasets.results2016, {id: cnst.ConstituencyCodeW07}))


    if(typeof(cnst.signature_count) != 'number'){
      cnst.signature_count = 0
    }


    cnst.signatures_per_10k_electors = 10000*cnst.signature_count/cnst.Electors2019

    cnst.signatures_per_10k_electors_formatted = cnst.signatures_per_10k_electors.toFixed(0)

  })

  constituencies = 
    _.reverse(
      _.sortBy(constituencies, 'signatures_per_10k_electors')
      )


  regions = _.groupBy(constituencies, x => x.SeneddRegionName)

  regions = _.mapValues(regions, function(cnsts){
    ret = {
      signature_count: d3.sum(cnsts, x => x.signature_count),
      Electors2019: d3.sum(cnsts, x => x.Electors2019),
    }

    ret.signatures_per_10k_electors = 10000*ret.signature_count/ret.Electors2019
    ret.signatures_per_10k_electors_formatted = ret.signatures_per_10k_electors.toFixed(0)
    
    return(ret)
  })

  regions = _.map(_.toPairs(regions), function(x){
    ret = x[1]
    ret.SeneddRegionName = x[0]
    return(ret)
  })

  regions = 
    _.reverse(
      _.sortBy(regions, 'signatures_per_10k_electors')
      )


  total_electors = d3.sum(constituencies, function(d){return d.Electors2019})
  total_signatures = d3.sum(constituencies, function(d){return d.signature_count})
  total_signatures_per_10k_electors = 10000*total_signatures/total_electors

  var domain_max = Math.max(
    quantile(d3.map(constituencies, function(d){return d.signatures_per_10k_electors}), 39/40),
    total_signatures_per_10k_electors+5*Math.sqrt(total_signatures_per_10k_electors)
    )

  colourScalePer10kElectors = d3.scaleDiverging(d3.interpolateBrBG)
    .domain(
      [
        total_signatures_per_10k_electors-5*Math.sqrt(total_signatures_per_10k_electors),
        total_signatures_per_10k_electors,
        domain_max
      ])


  _.each(constituencies, function(cnst){

    cnst.colour = colourScalePer10kElectors(cnst.signatures_per_10k_electors)
  })


  _.each(regions, function(reg){

    reg.colour = colourScalePer10kElectors(reg.signatures_per_10k_electors)
  })


  boundaries_with_data = datasets.boundaries

  _.each(boundaries_with_data, function(cnst){

    _.assign(cnst, _.find(constituencies, {ConstituencyCode: cnst.properties.nawc16cd}))

  })

  /*
    Update tables
  */

  constituency_rows = d3
    .select("#constituencies_table tbody")
    .selectAll("tr")
    .data(constituencies)

  constituency_rows
    .exit()
    .remove()

   constituency_rows
    .enter()
    .append("tr")
    .merge(constituency_rows)
    .html(function(d){
      return "<td style='background-color:"+ d.colour + ";'></td>"+
      "<td>"+d.ConstituencyNameEN+"</td>"+
      "<td>"+d.signature_count+"</td>"+
      "<td>"+d.signatures_per_10k_electors_formatted+"</td>"+
      "<td style='background-color:"+ d.colour + ";'></td>"
    })


  region_rows = d3
    .select("#regions_table tbody")
    .selectAll("tr")
    .data(regions)

  region_rows
    .exit()
    .remove()

   region_rows
    .enter()
    .append("tr")
    .merge(region_rows)
    .html(function(d){
      return "<td style='background-color:"+ d.colour + ";'></td>"+
      "<td>"+d.SeneddRegionName+"</td>"+
      "<td>"+d.signature_count+"</td>"+
      "<td>"+d.signatures_per_10k_electors_formatted+"</td>"+
      "<td style='background-color:"+ d.colour + ";'></td>"
    })



  /* 
    Update Map
  */

  var constituency_paths = d3.select("#map")
    .selectAll("path")
    .data(boundaries_with_data)

  constituency_paths
    .exit()
    .remove()

  constituency_paths
    .enter()
    .append('path')
    .merge(constituency_paths)
    .attr('d', geoGenerator)
    .attr('fill', function(d){return d.colour})
    .attr('stroke', function(d){return d.colour})



  $("#petition_header").addClass("ready")
  $("#petition_outputs").addClass("ready")

}

$(document).ready(function(evt){

  electors_promise = d3.csv("data/2019_electors.csv?220304");
  electors_promise.then(function(x){
    datasets.electors = x

    datasets.regions = _.flatMap([... new Set(_.flatMap(x, ct => ct.SeneddRegionName))], rg => {return {SeneddRegionName:rg}})

  });

  boundaries_promise =  d3.json("data/simple_constituency_boundaries.json");
  boundaries_promise.then(function(x){

    datasets.boundaries = x.features

    fixed_boundaries = datasets.boundaries.map(function(x){
      return turf.rewind(x, {reverse:true})
    })

    datasets.boundaries = fixed_boundaries
  });

  results_promise = d3.csv("data/2016_results_2.csv");
  results_promise.then(function(x){datasets.results2016 = x});

  Promise.all([electors_promise, boundaries_promise, results_promise]).then(function(x){
    $("#loading_screen").hide()

    $("#fetch_petition").click(fetch_petition_click)

    urlParams = new URLSearchParams(window.location.search);
    petition_id = urlParams.get('petition');

    if (petition_id) {
      $("#petition_url").val("https://petitions.senedd.wales/petitions/" + petition_id)
      fetch_petition_click()
    }

  });


})

fetch_petition_click = function(evt){

  $("#petition_header").removeClass("ready")
  $("#petition_outputs").removeClass("ready")

  petition_url = $("#petition_url").val()

  // TODO: Check url

  d3.json(petition_url+".json").then(petition_fetched)
}

