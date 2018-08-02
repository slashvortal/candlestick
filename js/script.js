
// Draw a candlestick chart based on passed prices
function drawChart(frequency) {

	d3.csv("UKX_5Mins_20180709_20180716.csv").then(function(prices) {

		const candleWidth = 5
		const months = {0 : 'Jan', 1 : 'Feb', 2 : 'Mar', 3 : 'Apr', 4 : 'May', 5 : 'Jun', 6 : 'Jul', 7 : 'Aug', 8 : 'Sep', 9 : 'Oct', 10 : 'Nov', 11 : 'Dec'}

		var dateFormat = d3.timeParse("%Y-%m-%d %H:%M");
		for (var i = 0; i < prices.length; i++) {
			//var dateFormat = d3.timeParse("%Y-%m-%d");
			
			prices[i]['Date'] = dateFormat(prices[i]['Date'])
		}

		const margin = {top: 15, right: 65, bottom: 105, left: 50},
		w = 1190 - margin.left - margin.right,
		h = 770 - margin.top - margin.bottom;
		
		var svg = d3.select("#candleChart")
					.append("svg")
					.attr("width", w + margin.left + margin.right)
					.attr("height", h + margin.top + margin.bottom)
					.append("g")
					.attr("transform", "translate(" +margin.left+ "," +margin.top+ ")");
		

		// Clip path to prevent shapes 'leaking' outside chart body
		svg.append("defs")
		   .append("clipPath")
			.attr("id", "clip")
		   .append("rect")
		    .attr("width", w)
			.attr("height", h)

		var chartBody = svg.append("g")
					.attr("class", "chartBody")
					.attr("clip-path", "url(#clip)");

		// x axis
		var xmin = d3.min(prices.map(function(r){ return r.Date.getTime(); }));
		var xmax = d3.max(prices.map(function(r){ return r.Date.getTime(); }));
		var xScale = d3.scaleBand().domain(_.map(prices, 'Date'))
					   .range([0, w])
					   .padding(0.2)

		//var handle = dateRange()
		//var filtered = _.filter(prices, d => d.Date >= handle['left'] && d.Date <= handle['right'])

		/* var xAxis = d3.axisBottom()
					   .scale(xScale)
					   .tickFormat(xScale.domain().filter(function(d,i){ 
							return !(i%100)
						}))
					   //.tickFormat(d => d.toDateString() + ' ' + d.toTimeString())
					   .tickSize(2); */
		
		//var t = d3.event.transform;
		
		var xAxis = d3.axisBottom()
					   .scale(xScale)
					   .tickValues(xScale.domain().filter(function(d,i){ 
						return !(i%300)
					}))
					.tickFormat(function(d){
						hours = d.getHours()
						amPM = hours < 13 ? 'am' : 'pm'
						 return hours + ':' + d.getMinutes() + amPM + ' ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()}
					);


		var gX = svg.append("g")
		   			.attr("class", "axis x-axis") //Assign "axis" class
					   .attr("transform", "translate(0," + h + ")")
					   .attr("clip-path", "url(#clip)")
					   .call(xAxis)

		gX.selectAll(".tick text")
		  //.select('text')
		  .call(wrap, xScale.bandwidth());
		
		// y axis
		var ymin = d3.min(prices.map(function(r){return r.Low;}));
		var ymax = d3.max(prices.map(function(r){return r.High;}));
		var yScale = d3.scaleLinear().domain([ymin, ymax]).range([h, 0]).nice();
		var yAxis = d3.axisLeft()
					  .scale(yScale)
				      .ticks(10)
		
		var gY = svg.append("g")
		   			.attr("class", "axis y-axis")
		   			.call(yAxis);
		
		// draw rectangles
		chartBody.selectAll("rect")
		   .data(prices)
		   .enter()
		   .append("rect")
		   .attr("x", function(d){
				return xScale(d.Date);
		   })
		   .attr("class", "candle")
		   .attr("y", function(d){return yScale(Math.max(d.Open, d.Close));})
		   .attr("width", candleWidth)
		   .attr("height", function(d){return yScale(Math.min(d.Open, d.Close))-yScale(Math.max(d.Open, d.Close	));})
		   .attr("fill", function(d){return d.Open>d.Close ? "red" : "green"});
		
		// draw high and low
		chartBody.selectAll("g.line")
		   .data(prices)
		   .enter()
		   .append("line")
		   .attr("class", "stem")
		   .attr("x1", function(d){return xScale(d.Date) + 0.5*candleWidth; })
		   .attr("x2", function(d){return xScale(d.Date) + 0.5*candleWidth; })
		   .attr("y1", function(d){return yScale(d.High);})
		   .attr("y2", function(d){return yScale(d.Low);})
		   .attr("stroke", function(d){return d.Open > d.Close ? "red" : "green"; })

		svg.append("rect")
		   .attr("id","rect")
		   .attr("width", w)
		   .attr("height", h)
		   .style("fill", "none")
		   .style("pointer-events", "all")
		
		const extent = [[margin.left, margin.top], [w - margin.right, h - margin.top]];
		
		var zoom = d3.zoom()
					 .scaleExtent([1, 8])
					 .translateExtent(extent)
					 .extent(extent)
					 .on("start", console.log("Its started!"))
					 .on("zoom", zoomed)
					 .on("end", console.log("Its ended!"))

		d3.select("#rect").call(zoom);

		console.log(d3.zoomTransform(zoom).k, prices.length);
		
		function dateRange(t){
			var t = d3.event.transform
			var invDomain = xScale.domain()
			var invRange = xScale.range()
			var invScale = d3.scaleQuantize().domain(invRange).range(invDomain)

			leftDate = invScale(Math.abs(xScale.range()[0])/t.k)
			rightDate = invScale(w-Math.abs(w-xScale.range()[1])/t.k)

			return {'left' : leftDate, 'right' : rightDate};
		}

		function zoomed() {
			var t = d3.event.transform, yt = t.rescaleY(yScale)
			xScale.range([0, w].map(d => d3.event.transform.applyX(d)));
			var handle = dateRange();
			var currentZoom = d3.event.transform;
			
			filtered = _.filter(prices, d => d.Date >= handle['left'] && d.Date <= handle['right'])
			minp = d3.min(filtered, d => d.Low || Infinity)
			maxp = d3.max(filtered, d => d.High)

			chartBody.selectAll(".candle").attr("x", d => xScale(d.Date)).attr("width", xScale.bandwidth());
			chartBody.selectAll(".stem").attr("x1", d => xScale(d.Date) + xScale.bandwidth()/2);
			chartBody.selectAll(".stem").attr("x2", d => xScale(d.Date) + xScale.bandwidth()/2);

			console.log(handle['left'], handle['right']);
			
			var xmin = d3.min(filtered.map(function(r){ return r.Date.getTime(); }));
			var xmax = d3.max(filtered.map(function(r){ return r.Date.getTime(); }));
			var xScaleZ = d3.scaleBand().domain(_.map(filtered, 'Date'))
						   .range([0, w].map(d => d3.event.transform.applyX(d)))
						   .padding(0.2)


			var xAxisZ = d3.axisBottom()
					   .scale(xScaleZ)
					   .tickValues(xScaleZ.domain().filter(function(d,i){
							scaleFloor = Math.floor(t.k)
							//console.log(scaleFloor)
							map = {1 : 300, 2 : 53.4, 3 : 14.1, 4 : 7.9, 5 : 5.6, 6 : 3.9, 7 : 2.9, 8 : 2.3}
							//console.log(map[scaleFloor]);
						return !(i%Math.floor(map[scaleFloor]/2))
					}))
					.tickFormat(function(d){
						hours = d.getHours()
						amPM = hours < 13 ? 'am' : 'pm'
						return hours + ':' + d.getMinutes() + amPM + ' ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()}
				    );


			d3.select('.x-axis').call(xAxisZ)
			
			yScale.domain([minp, maxp]).range([h, 0]);
			gY.call(yAxis.scale(d3.event.transform.rescaleY(yScale)));
			
			gX.selectAll(".tick text")
		  		.call(wrap, xScale.bandwidth())

			//d3.zoom().on("start", console.log("Its started!"));
			//d3.zoom().on("zoom", sleep(3000))
			//d3.zoom().on("end", console.log(xAxis.tickValues()));
		}
		
	});
}

function getShortMonth(date){
	var month = date.getMonth()
	months = {0 : 'Jan', 1 : 'Feb', 2 : 'Mar', 3 : 'Apr', 4 : 'May', 5 : 'Jun', 6 : 'Jul', 7 : 'Aug', 8 : 'Sep', 9 : 'Oct', 10 : 'Nov', 11 : 'Dec'}

	if (month == 0 | month == 7){
		return months[month] + ' ' + date.getFullYear()
	}
	else {
		return months[month]
	}
}

function wrap(text, width) {
	text.each(function() {
	  var text = d3.select(this),
		  words = text.text().split(/\s+/).reverse(),
		  word,
		  line = [],
		  lineNumber = 0,
		  lineHeight = 1.1, // ems
		  y = text.attr("y"),
		  dy = parseFloat(text.attr("dy")),
		  tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
	  while (word = words.pop()) {
		line.push(word);
		tspan.text(line.join(" "));
		if (tspan.node().getComputedTextLength() > width) {
		  line.pop();
		  tspan.text(line.join(" "));
		  line = [word];
		  tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
		}
	  }
	});
}



function sleep(milliseconds) {
	var start = new Date().getTime();
	for (var i = 0; i < 1e7; i++) {
	  if ((new Date().getTime() - start) > milliseconds){
		break;
	  }
	}
  }

drawChart();