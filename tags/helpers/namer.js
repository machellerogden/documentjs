steal('./tree.js','./typer',function(tree, typer){
	
	var eachBetweenCommas = function(arr,cb,betweener){
		var cur = [],
			i = 0,
			betweener = betweener || ",",
			index = 0;
		while(i < arr.length){
			
			if(arr[i] == betweener){
				if(cur.length){
					cb(cur,index++);
					cur  = [];
				} 
			} else {
				cur.push(arr[i])
			}
			i++
		}
		if(cur.length){
			cb(cur, index++);
		} 
	};
	
	
	var process = function(children, obj){
		
		if(!children || !children.length){
			return obj;
		} else if(typeof children[0] === "string") {

			switch(children[0]){
				case "=": 
					obj.optional = true;
					if(children[1]){
						obj.defaultValue = typer.process([children[1]],{}).types[0];
					}
					process(children.slice(2), obj);
					break;
				
				case "?": 
					obj.nullable = true;
					process(children.slice(1), obj);
					break;
				case "!":
					obj.nonnull = true;
					process(children.slice(1), obj);
					break;
				case "function":
					var types = obj.types || (obj.types = []),
						type = {type: "function"};
					types.push(type);
					
					type.constructs = undefined;
					type.returns = {types: [{type: "undefined"}]};
					type.params = [];
					type.context = undefined;
					
					var next = children[1];
					if(next) {
						eachBetweenCommas(next.children, function(typeChildren){
							if(typeChildren[1] == ":"){
								if(typeChildren[0] == "new"){
									type.constructs = process( typeChildren.slice(2), {} );
								} else if(typeChildren[0] == "this"){
									type.context = process( typeChildren.slice(2), {} );
								}
							} else {
								type.params.push(
									process(typeChildren, {})
								)
							}
						});
					}
					// children[2] === ":"
					if( children[3] ) {
						type.returns = process( children.slice(3), {} )
					};
					break;
				case "...":
					obj.variable = true;
					process(children.slice(1), obj);
					break;
				default:
					obj.name = children[0];
					process(children.slice(1), obj);
			}
		} else if(children[0].type){
			switch(children[0].type){
				case "[":
					obj.optional = true;
					process(children[0].children,obj)
					break;
				case "{": // Record object {foo: Bar, cat, dog}
				
					var types = obj.types || (obj.types = []),
						type = {type: "Object"};
					types.push(type);
					type.options = [],
					eachBetweenCommas(children[0].children, function(typeChildren){
						var option = {
							name: typeChildren[0]
						}
						if(typeChildren[2]){
							process(typeChildren.slice(2), option)
						}
						type.options.push(option)
					})
					break;
					
				case "(": // params
					
					eachBetweenCommas(children[0].children,function(typeChildren, index){
						// this should really be trying to find the function by looking in types
						if(!obj.types[0].params[index]) {
							// sometimes types of args is not specified
							obj.types[0].params[index] = {}
						}

						process(typeChildren, obj.types[0].params[index] );
					})
			}
		}
		return obj
	}

	return {
		tokens: ["\\?", "\\!", "function", "\\.\\.\\.", ",", "\\:", "\\|", "="],
		process: process,
		name: function(str, typeData){
			return process(this.tree(str), typeData)
		},
		tree: function(str){
			return tree(str, "("+this.tokens.join("|")+")", "(\\s)" );
		}
	}
	
})
