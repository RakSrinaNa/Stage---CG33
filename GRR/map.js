/**
 * Created by tcouchoud on 04/06/2015.
 */

/********************************************************************************************
 * PARAMETRES
 *******************************************************************************************/
var mapID = "e6bcd9a0fbe24ac2834c17aba7653bda"; //ID par default de la map

var validTokenMinutes = 10 * 60; //Nombre de minutes ou le token est valide (pas de reconnexion requise)

var exportColumns = "*"; //Colonnes a exporter pour afficher les resultats ('X,Y,...' pour obtenir les champs X, Y etc ou '*' pour obtenir tout les champs)
var infoTitle = "Infos: ${ROOM_NAME}"; //Titre de la fenetre d'infos (${X} correspond a la valeur de la colonne X)

var idBasemapKeep = ["95acf7dbe25542088058a13f621047ac", "0ffccdb3e3ae4c8591133525fa0f2bd8", ]; //ID des fonds de carte a conserver

/*****************************PLACEMNTS COMPOSANTS*************************************************/
var mapDiv = "map"; //ID Du composant HTML ou sera place la map
var basemapGalleryDiv = "basemapGallery"; //ID Du composant HTML ou sera place la gallerie de fonds de map
var searchBarDiv = "searchMap";

var idClear = "clear";
var idSearchName = "searchName";
var idStartDate = "startDate";
var idStartTime = "startTime";
var idEndDate = "endDate";
var idEndTime = "endTime";
var idSearch = "search";
var idInfo = "info"; //ID de la section pour le texte d'information
var idLogout = "logout";

/*****************************TEXTES*************************************************/


/********************************************************************************************
 * DEBUT CODE
 *******************************************************************************************/
/*****************************MAP*************************************************/

//On charge les differents modules souhaites et les passons en parametres de la fonction appelee lorsque tout a ete charge
require(["esri/map", "esri/geometry/Circle", "esri/dijit/LocateButton", "esri/dijit/Directions", "esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleFillSymbol", "esri/tasks/QueryTask", "esri/layers/TimeInfo", "dojo/_base/array", "esri/dijit/TimeSlider", "esri/dijit/Legend", "esri/IdentityManager", "esri/dijit/BasemapGallery", "esri/arcgis/utils", "esri/config", "esri/graphicsUtils", "esri/layers/GraphicsLayer", "esri/geometry/Point", "esri/dijit/Search", "esri/geometry/Extent", "esri/graphic", "esri/symbols/PictureMarkerSymbol", "esri/layers/FeatureLayer", "esri/InfoTemplate", "esri/tasks/query", "esri/Color", "dojo/cookie", "dojo/json", "dojo/on", "dojo/parser", "dojo/dom", "dojo/domReady!"], function(Map, Circle, LocateButton, Directions, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, QueryTask, TimeInfo, array, TimeSlider, Legend, EsriID, BasemapGallery, ArcgisUtils, esriConfig, GraphicsUtils, GraphicsLayer, Point, Search, Extent, Graphic, PictureMarkerSymbol, FeatureLayer, InfoTemplate, Query, Color, cookie, JSON, on, parser, dom)
	{
		var map; //La map
		var popup; //Infobulle
		var reservationsLayer; //Couche Feature
		var sallesLayer;
		var filBleuLayer;
		var filBleuGraphicLayer;
		var infoTemplate; //Schema de presentation des donnees pour le featurelayer
		var infoTemplateOcc;
		var graphicLayer;
		var routeLayer;
		var cred = "TOKEN"; //La clef de stockage du token
		var directions;

		parser.parse();
		esriConfig.defaults.io.proxyUrl = "/proxy/";

		EsriID.on("credential-create", storeCredentials); //Sauvegarde du token lors de la creation de cului-ci
		EsriID.tokenValidity = validTokenMinutes; //Cree des token d'une validite de validTokenMinutes minutes

		loadCredentials(); //Charge un eventuel token deja existant

		var mapDef = ArcgisUtils.createMap(mapID, mapDiv); //Creation de la map
		mapDef.then(mapLoaded, function(error) //Appel de mapLoaded quand celle ci est chargee, sinon on affiche l'erreur
		{
			console.log('Create Map Failed: ', error);
		});

		/**
		 * Charge un token depuis le cache, si existant.
		 */
		function loadCredentials()
		{
			var idJson, idObject;

			//Recuperation de la variable stockee
			if(supportsLocalStorage())
			{
				idJson = window.localStorage.getItem(cred);
			}
			else
			{
				idJson = cookie(cred);
			}
			if(idJson && idJson != "null" && idJson.length > 4)
			{
				idObject = JSON.parse(idJson); //Convertis la variable en objet JSON
				EsriID.initialize(idObject);  //Utilise cet object pour la session
			}
		}

		/**
		 * Stocke le token dans le cache.
		 */
		function storeCredentials()
		{
			if(EsriID.credentials.length === 0) //Si il n'y a pas de token on arrete
			{
				return;
			}

			var idString = JSON.stringify(EsriID.toJson()); //Convertis l'objet JSON en String pour pouvoir etre stocke
			if(supportsLocalStorage())
			{
				window.localStorage.setItem(cred, idString);
			}
			else
			{
				cookie(cred, idString, {expires: 1});
			}
		}

		/**
		 * Deconnexion (destruction du token et suppression du cache)
		 */
		function logout()
		{
			EsriID.destroyCredentials();
			if(supportsLocalStorage())
			{
				window.localStorage.removeItem(cred);
			}
			else
			{
				cookie(cred, "", {expires: 0});
			}
			location.reload(); //Actualisation de la page
		}

		/**
		 * Permet de savoir si on peut utiliser le local storage ou si il faut utiliser les cookies.
		 *
		 * @returns {boolean} True si le local storage est supporte, false sinon.
		 */
		function supportsLocalStorage()
		{
			try
			{
				return "localStorage" in window && window["localStorage"] !== null;
			}
			catch(e)
			{
				return false;
			}
		}

		function getPropertyName(prop)
		{
			switch(prop)
			{
				case "ID_RESA": return "ID R&eacute;servation";
				case "ACCES_HANDICAPE": return "Acc&egrave;s handicap&eacute;";
				case "ADRESSE": return "Adresse";
				case "AREA_NAME": return "Zone";
				case "CAPACITY": return "Capacit&eacute;";
				case "CP": return "Code postal";
				case "DESCRIPTION": return "Description";
				case "ETAGE": return "&Eacute;tage";
				case "FILBLEU": return "Acc&egrave;s FilBleu";
				case "FILVERT": return "Acc&egrave;s FilVert";
				case "INTERNET": return "Acc&egrave;s internet";
				case "MATERIEL": return "Mat&eacute;riel";
				case "REMARQUE": return "Remarque";
				case "ROOM_NAME": return "Salle";
				case "SNCF": return "Acc&egrave;s train";
				case "VILLE": return "Ville";
				case "START_TIME": return "Heure de d&eacute;but";
				case "END_TIME": return "Heure de fin";
				default : return prop;
			}
		}

		function getValue(property, value)
		{
			if(!value)
			{
				return "?";
			}
			switch(property)
			{
				case "ACCES_HANDICAPE": return value === "y" ? "Oui" : "Non";
				case "CAPACITY": return "" + value + " personnes";
				case "ETAGE": return "" + (value <= 0 ? (value == -1 ? "Sous-sol" : (value == 0 ? "Rez-de-chauss&eacute;e" : value)) : (value + (value == 1 ? "er" : "&egrave;me") + " &eacute;tage"));
				case "INTERNET": return value === "invites" ? "Proc&eacute;dure gestion des comptes invit&eacute;s du r&eacute;seau WIFI (accueil)" : value;
				case "START_TIME":
				case "END_TIME":
					var val = "" + value;
					return val.substring(0, 4) + "/" + val.substring(6, 8) + "/" + val.substring(4, 6) + " " + val.substring(8, 10) + ":" + val.substring(10, 12) + ":" + val.substring(12);
				default : return ("" + value).split('&').join(' / ');
			}
		}

		function getTextContent(graphic, occupied)
		{
			var out = occupied ? '<div align="center"><b>SALLE RESERV&Eacute;E SUR CETTE P&Eacute;RIODE!</b></div><br />' : '';
			var attr = graphic.attributes;
			for(var property in attr)
			{
				if(attr.hasOwnProperty(property))
				{
					if(property === "START_TIME" || property === "END_TIME" || property === "ID_RESA" || property === "OBJECTID" || property === "ROOM_ID" || property === "ROOM_PICTURE" || property === "AREA_ID" || property === "MORNINGSTARTS_AREA" || property === "EVENINGENDS_AREA")
					{
						continue;
					}
					out += '<b>' + getPropertyName(property) + '</b> : ' + getValue(property, attr[property]) + '<br />';
				}
			}
			return out;
		}

		function getTextContentOC(graphic)
		{
			return getTextContent(graphic, true);
		}

		function getTextContentUC(graphic)
		{
			return getTextContent(graphic, false);
		}

		function selectSalleByName()
		{
			var selector = document.getElementById(idSearchName);
			var id = parseInt(selector[selector.selectedIndex].value);
			for(var i = 0, c = sallesLayer.graphics.length; i < c; i++)
			{
				var gr = sallesLayer.graphics[i];
				if(gr.attributes.hasOwnProperty('ROOM_ID') && gr.attributes.ROOM_ID === id)
				{
					centerGraph(gr);
					map.infoWindow.setFeatures([gr]);
					map.infoWindow.show(gr.geometry);
					return;
				}
			}
		}

		function clearAll()
		{
			routeLayer.clear();
			filBleuGraphicLayer.clear();
			directions.reset();
		}

		/**
		 * Initialise les parametres apres la creation de la map
		 *
		 * @param response La reponse du load map.
		 */
		function mapLoaded(response)
		{
			map = response.map; //Recuperation de la map cree

			var layers = map.getLayersVisibleAtScale(map.getScale()); //Recuperation des couches visibles
			for(var i = 0, c = layers.length; i < c; i++)
			{
				var layer = layers[i];
				console.log(layer);
				if(layer.id && layer.id === "Resa_Salle_1941" && layer.geometryType && layer.geometryType.includes("Point"))
				{
					reservationsLayer = layer;
				}
				else if(layer.id && layer.id === "Resa_Salle_1866" && layer.geometryType && layer.geometryType.includes("Point"))
				{
					sallesLayer = layer;
				}
				else if(layer.id && layer.id === "Transports_Tramway_1502" && layer.geometryType && layer.geometryType.includes("Point"))
				{
					filBleuLayer = layer;
				}
			}
			infoTemplate = new InfoTemplate(infoTitle); //Fenetre de presentation des resultats
			infoTemplate.setContent(getTextContentUC);

			infoTemplateOcc = new InfoTemplate(infoTitle); //Fenetre de presentation des resultats
			infoTemplateOcc.setContent(getTextContentOC);

			var infoTemplateFB = new InfoTemplate("${NOM_COMMER}", "<b>ARR&Ecirc;T: </b> ${NOM_COMMER}"); //Fenetre de presentation des resultats

			sallesLayer.mode = FeatureLayer.MODE_ONDEMAND;
			sallesLayer.outFields = [exportColumns]; // Colones a exporter pour l'affichage
			sallesLayer.opacity = .90;
			sallesLayer.infoTemplate = infoTemplate;
			sallesLayer.spatialReference = map.spatialReference;
			sallesLayer.hide();

			reservationsLayer.mode = FeatureLayer.MODE_SNAPSHOT;
			reservationsLayer.outFields = ["*"]; // Colones a exporter pour l'affichage
			reservationsLayer.opacity = .90;
			reservationsLayer.spatialReference = map.spatialReference;
			reservationsLayer.hide();

			filBleuLayer.mode = FeatureLayer.MODE_SNAPSHOT;
			filBleuLayer.outFields = ["*"]; // Colones a exporter pour l'affichage
			filBleuLayer.opacity = .90;
			filBleuLayer.spatialReference = map.spatialReference;
			filBleuLayer.hide();

			graphicLayer = new GraphicsLayer();
			graphicLayer.setInfoTemplate(infoTemplate);
			graphicLayer.spatialReference = map.spatialReference;
			map.addLayer(graphicLayer, 99);

			routeLayer = new GraphicsLayer();
			routeLayer.spatialReference = map.spatialReference;
			map.addLayer(routeLayer, 98);

			filBleuGraphicLayer = new GraphicsLayer();
			filBleuGraphicLayer.spatialReference = map.spatialReference;
			filBleuGraphicLayer.infoTemplate = infoTemplateFB;
			map.addLayer(filBleuGraphicLayer, 97);

			directions = new Directions({
				map: map
			},"daazejaeppepjo");
			directions.startup();

			var s = new Search({
				map: map
			},searchBarDiv);
			s.startup();

			var basemapGallery = new BasemapGallery({
				showArcGISBasemaps: true, map: map
			}, basemapGalleryDiv);
			basemapGallery.on("load", function()
			{
				var idDel = [];
				for(var i = 0, c = basemapGallery.basemaps.length; i < c; i++) //Recuperation des ids des fonds de cartes a retirer
				{
					var id = basemapGallery.basemaps[i].itemId;
					if(id && idBasemapKeep && idBasemapKeep.indexOf(id) === -1) //Si ce n'est pas un fond a conserver
					{
						idDel.push(basemapGallery.basemaps[i].id);
					}
				}
				for(i = 0, c = idDel.length; i < c; i++) //Suppression des fond de cartes non voulus
				{
					basemapGallery.remove(idDel[i]);
				}
			});
			basemapGallery.startup(); //Creation et demarrage de la gallerie de fonds de map

			popup = map.infoWindow; //Recuperation de l'infobulle liee a la map
			popup.highlight = true;
			popup.titleInBody = false;

			//Ajout des evenements
			map.on("dbl-click", clickMap); //Click sur la map

			dom.byId(idLogout).addEventListener("click", logout); //Click sur le bouton de deconexion
			dom.byId(idSearch).addEventListener("click", selectDates);
			dom.byId(idClear).addEventListener("click", clearAll);

			dom.byId(idSearchName).addEventListener("keypress", adressKeyPressed);

			dom.byId(idSearchName).addEventListener("change", selectSalleByName);

			setTimeout(selectDates, 750);

			setTimeout(function()
			{
				var x = document.getElementById(idSearchName);
				for(var i = 0, c = sallesLayer.graphics.length; i < c; i++)
				{
					var gr = sallesLayer.graphics[i];
					if(gr.attributes.hasOwnProperty("ROOM_NAME") && gr.attributes.hasOwnProperty("ROOM_ID"))
					{
						var option = document.createElement("option");
						option.value = gr.attributes.ROOM_ID;
						option.innerHTML = gr.attributes.ROOM_NAME;
						x.add(option);
					}
				}
			}, 2000);
		}

		function adressKeyPressed(event)
		{
			if(event.keyCode == 13)
				selectSalleByName();
		}

		/**
		 * Remplace les caracteres html comme &eacute; par leur 'vrai' caractere.
		 *
		 * @param html Le texte HTML.
		 * @returns {string}
		 */
		function decodeHtml(html)
		{
			var txt = document.createElement("textarea");
			txt.innerHTML = html;
			return txt.value;
		}

		function showRoute(e) {
			var directionss = e.routeResults[0].directions;
			var routeSymbol = new SimpleLineSymbol().setColor(new Color([0,0,255,0.5])).setWidth(4);
			map.setExtent(directionss.mergedGeometry.getExtent(), true);
			var routeGraphic = new Graphic(directionss.mergedGeometry, routeSymbol);
			routeLayer.clear();
			routeLayer.add(routeGraphic);
			routeLayer.redraw();
			map.setExtent(directionss.extent, true);
		}

		function showFilBleu(point)
		{
			filBleuGraphicLayer.clear();
			var circle = new Circle(point, {
				radius: 400
			});
			circle.spatialReference = map.spatialReference;
			for(var i = 0, c = filBleuLayer.graphics.length; i < c; i++)
			{
				var gr = filBleuLayer.graphics[i];
				if(circle.contains(gr.geometry))
				{
					var sym = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
							new Color([0,0,255]), 1.5),
						new Color([0,0,255,0.25]));
					gr.symbol = sym;
					filBleuGraphicLayer.add(gr);
				}
			}
			filBleuGraphicLayer.redraw();
		}

		/**
		 * Place le point (ou modifie) a l'emplacement du clic.
		 *
		 * @param event L'evenement du click.
		 */
		function clickMap(event)
		{
			if(event.graphic && event.mapPoint)
			{
				var point = event.mapPoint;
				directions.reset().then(function(r1)
				{
					directions.useMyCurrentLocation(0).then(function(r2)
					{
						directions.addStop(point, 1).then(function(r3)
						{
							directions.getDirections().then(function(r4)
							{
								showRoute(r4);
								showFilBleu(event.mapPoint);
							});
						});
					});
				});
			}
		}

		function centerGraph(graph)
		{
			if(!graph)
			{
				return;
			}
			var point = graph.geometry;
			setTimeout(function(){map.centerAt(point);}, 500);
		}

		/**
		 * Centre la map sur les points passes en parametres.
		 *
		 * @param results Les points sur lesquels centrer.
		 */
		function centerFeat(results)
		{
			if(!results)
			{
				return;
			}
			var extent = GraphicsUtils.graphicsExtent(results);
			if(!extent && results.length == 1)
			{
				var point = results[0];
				extent = new Extent(point.x - 1, point.y - 1, point.x + 1, point.y + 1, point.SpatialReference);
			}
			if(extent)
			{
				extent = extent.expand(1.5);
				map.setExtent(extent);
			}
		}

		function tDigit(i)
		{
			return ("0" + i).slice(-2);
		}

		function dateToTimestamp(date, time)
		{
			var dat = new Date();
			var dd = dat.getDate() + parseInt(date);
			var md = new Date(dat.getYear(), dat.getMonth() + 1, 0).getDate();
			var nm = dat.getMonth() + (dd / md);
			dat.setYear(dat.getFullYear() + (nm / 12));
			dat.setMonth(nm % 12);
			dat.setDate(dd % md);
			dat.setHours(parseInt(time));
			dat.setMinutes(0);
			dat.setSeconds(0);
			return "" + dat.getFullYear() + "" + tDigit(dat.getMonth() + 1) + "" +  tDigit(dat.getDate()) + "" + tDigit(dat.getHours()) + "" + tDigit(dat.getMinutes()) + "" + tDigit(dat.getSeconds());
		}

		function getReservedRooms(result)
		{
			var arr = [];
			for(var i = 0, c = result.length; i < c; i++)
			{
				arr[result[i].attributes.ROOM_NAME + result[i].attributes.AREA_NAME] = 1;
			}
			return arr;
		}

		function createPin(occupied, capacity)
		{
			var r = 27;
			if(capacity < 10)
			{
				r = 10;
			}
			else if(capacity < 25)
			{
				r = 20;
			}
			else if(capacity < 50)
			{
				r = 30;
			}
			else if(capacity < 100)
			{
				r = 40;
			}
			else
			{
				r = 50;
			}
			if(occupied)
			{
				return new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, r,
					new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
						new Color([255,0,0]), 1.5),
					new Color([255,140,40,0.25]));
			}
			else
			{
				return new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, r,
					new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
						new Color([0,255,0]), 1.5),
					new Color([255,140,40,0.25]));
			}
		}

		function selectDates()
		{
			var cityQueryTask = new QueryTask("http://sig.cg37.fr/arcgis/rest/services/ext/Resa_Salle/MapServer/0");
			var cityQuery = new Query();
			cityQuery.outFields = ["*"];
			cityQuery.returnGeometry = true;
			cityQuery.where = "START_TIME >= " + dateToTimestamp(dom.byId(idStartDate).value, dom.byId(idStartTime).value) + " AND START_TIME <= " + dateToTimestamp(dom.byId(idEndDate).value, dom.byId(idEndTime).value);
			cityQueryTask.execute(cityQuery, function(results)
			{
				var res = getReservedRooms(results.features);
				graphicLayer.clear();
				for(var i = 0, c = sallesLayer.graphics.length; i < c; i++)
				{
					var graph = sallesLayer.graphics[i];
					var occ = res.hasOwnProperty(graph.attributes.ROOM_NAME + graph.attributes.AREA_NAME);
					graph.symbol = createPin(occ, graph.attributes.CAPACITY);
					graph.infoTemplate = occ ? infoTemplateOcc : infoTemplate;
					graphicLayer.add(graph);
				}
				setTimeout(function(){centerFeat(graphicLayer.graphics)}, 500);
			});
		}

		/**
		 * Cree un pin a partir d'une image.
		 *
		 * @param url L'url de l'image.
		 * @param xOffset Decallage horizontal.
		 * @param yOffset Decallage vertical.
		 * @param xWidth Largeur de l'image.
		 * @param yHeight Hauteur de l'image.
		 * @returns {PictureMarkerSymbol} Le pin cree avec l'url.
		 */
		function createPictureSymbol(url, xOffset, yOffset, xWidth, yHeight)
		{
			return new PictureMarkerSymbol({
					"angle": 0,
					"xoffset": xOffset,
					"yoffset": yOffset,
					"type": "esriPMS",
					"url": url,
					"contentType": "image/png",
					"width": xWidth,
					"height": yHeight
				});
		}

		/**
		 * Definit le text d'information de la page.
		 *
		 * @param text Le text a definir.
		 * @param red Afficher le texte en rouge?
		 */
		function setInfoText(text, red)
		{
			dom.byId(idInfo).innerHTML = text;

			if(red)
			{
				var add = false;
				var style = document.getElementById(idInfo).style;
				var pas = 1;
				var color = new RGBA(0, 0, 0, 1);
				var intervalID = setInterval(function()
				{
					color.red -= pas;
					style.color = color.getCSS();
					if(add)
					{
						pas = 10;
						add = !(color.red <= 0);
						if(!add)
						{
							clearInterval(intervalID);
						}
					}
					else
					{
						pas = -30;
						add = color.red >= 600;
					}
				}, 50);

				function RGBA(red, green, blue, alpha)
				{
					this.red = red;
					this.green = green;
					this.blue = blue;
					this.alpha = alpha;
					this.getCSS = function()
					{
						var rred = this.red > 255 ? 255 : this.red < 0 ? 0 : this.red;
						var ggreen = this.green > 255 ? 255 : this.green < 0 ? 0 : this.green;
						var bblue = this.blue > 255 ? 255 : this.blue < 0 ? 0 : this.blue;
						var aalpha = this.alpha > 1 ? 1 : this.alpha < 0 ? 0 : this.alpha;
						return "rgba(" + rred + "," + ggreen + "," + bblue + "," + aalpha + ")";
					}
				}
			}
		}
	});
