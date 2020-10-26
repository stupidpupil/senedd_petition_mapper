var projection = d3.geoMercator()
  .scale(9500)
  .center([-3.8, 52.4])
  .translate([300, 300])

var geoGenerator = d3.geoPath()
  .projection(projection);

var datasets = {}

petition_fetched = function(pt_json){
  console.log(pt_json)

  constituency_counts = pt_json.data.attributes.signatures_by_constituency

  _.each(constituency_counts, function(cnst){
    _.assign(cnst, _.find(datasets.electors, {Area_Code:cnst.id}))

    cnst.signatures_per_10k_electors = 10000*cnst.signature_count/cnst.Data

    cnst.signatures_per_10k_electors_formatted = cnst.signatures_per_10k_electors.toFixed(0)

  })

  constituency_counts = 
    _.reverse(
      _.sortBy(constituency_counts, 'signatures_per_10k_electors')
      )


  total_electors = d3.sum(constituency_counts, function(d){return d.Data})
  total_signatures = d3.sum(constituency_counts, function(d){return d.signature_count})
  total_signatures_per_10k_electors = 10000*total_signatures/total_electors

  colourScalePer10kElectors = d3.scaleDiverging(d3.interpolateBrBG)
    .domain(
      [
        total_signatures_per_10k_electors-5*Math.sqrt(total_signatures_per_10k_electors),
        total_signatures_per_10k_electors,
        total_signatures_per_10k_electors+5*Math.sqrt(total_signatures_per_10k_electors)
      ])

  _.each(constituency_counts, function(cnst){
    cnst.colour = colourScalePer10kElectors(cnst.signatures_per_10k_electors)
  })

  boundaries_with_data = datasets.boundaries

  _.each(boundaries_with_data, function(cnst){

    _.assign(cnst, _.find(constituency_counts, {id: cnst.properties.nawc16cd}))

  })


  console.log(constituency_counts)

  /*
    Update table
  */

  constituency_rows = d3
    .select("#constituencies_table tbody")
    .selectAll("tr")
    .data(constituency_counts)

  constituency_rows
    .exit()
    .remove()

   constituency_rows
    .enter()
    .append("tr")
    .merge(constituency_rows)
    .html(function(d){
      return "<td style='background-color:"+ d.colour + ";'></td>"+
      "<td>"+d.name+"</td>"+
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

}

$(document).ready(function(evt){

  d3.csv("data/2019_electors.csv").then(function(x){datasets.electors = x})

  d3.json("data/constituency_boundaries.geojson").then(function(x){

    datasets.boundaries = x.features

    fixed_boundaries = datasets.boundaries.map(function(x){
      return turf.rewind(x, {reverse:true})
    })

  datasets.boundaries = fixed_boundaries

})



  $("#fetch_petition").click(fetch_petition_click)
})

fetch_petition_click = function(evt){

  petition_url = $("#petition_url").val()

  // TODO: Check url

  d3.json(petition_url+".json").then(petition_fetched)
}

