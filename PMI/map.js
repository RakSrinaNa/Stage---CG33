/**
 * Created by tcouchoud on 04/06/2015.
 */

/********************************************************************************************
 * PARAMETRES
 *******************************************************************************************/
var mapID = "0bd304e964f44a83abdd5ffb81aaaa8a"; //ID par default de la map

var validTokenMinutes = 10 * 60; //Nombre de minutes ou le token est valide (pas de reconnexion requise)

var exportColumns = "ID"; //Colonnes a exporter pour afficher les resultats ('X,Y,...' pour obtenir les champs X, Y etc ou '*' pour obtenir tout les champs)
var infoTitle = "Infos: ${ID}"; //Titre de la fenetre d'infos (${X} correspond a la valeur de la colonne X)
var infoBody = "ID Dossier: ${ID}"; //Contenu de la fenetre d'infos (${X} correspond a la valeur de la colonne X)

var idBasemapKeep = ["95acf7dbe25542088058a13f621047ac", "f1aa737df8cb43a18f316dc38c673a6b", "0ffccdb3e3ae4c8591133525fa0f2bd8", "e9eaeb01c2e74d109657a1398d8deca0"]; //ID des fonds de carte a conserver

/*****************************PLACEMNTS COMPOSANTS*************************************************/
var mapDiv = "map"; //ID Du composant HTML ou sera place la map
var basemapGalleryDiv = "basemapGallery"; //ID Du composant HTML ou sera place la gallerie de fonds de map
var searchDiv = "search"; //ID Du composant HTML ou sera place la boite de recherche

var idAddress = "adr"; //ID du champ de texte pour l'adresse
var idSearch = "add"; //ID du bouton lancant la recherche de l'adresse
var idValid = "val"; //ID du bouton validant le placement
var idLogout = "logout"; //ID du bouton de deconnexion
var idDos = "dos"; //ID du champ de texte du nemero de dossier
var idInfo = "info"; //ID de la section pour le texte d'information

/*****************************TEXTES*************************************************/

var helpText = "Ajoutez le dossier &agrave; la carte en pla&ccedil;ant le marqueur orange au bon endroit. Renseignez le num&eacute;ro de dossier puis validez pour confirmer le placement."; //Texte affiche au lancement de l'app
var noIDText = "Num&eacute;ro de dossier manquant"; //Texte affiche quand il n'y a pas d'ID renseigne
var noAddressText = "Emplacement du dossier non defini"; //Texte affiche lorque le point n'est pas place sur la carte
var IDTakenText = "Num&eacute;ro de dossier d&eacute;j&agrave; enregistr&eacute;"; //Texte affiche lorsque l'ID est deja dans la BDD
var pointSetText = "Point ajout&eacute;<br /><br />Vous pouvez placer un autre point pour ajouter un autre dossier &agrave; la carte."; //Text affiche lorsqu'un point a ete ajoute
var noLayerText = "Aucune couche o&ugrave; &eacute;crire n'a &eacute;t&eacute; trouv&eacute;e!"; //Texte affiche si aucun layer n'a ete trouve

/*****************************PARAMETRES URL*************************************************/
var mapIDKey = "webmap"; //Clef du parametre correspond a l'ID de la map
var addressKey = "address"; //Clef du parametre correspond a l'adresse
var idKey = "id"; //Clef du parametre correspond a l'ID de dossier
var countryKey = "country"; //Clef du parametre correspond au pays

/********************************************************************************************
 * DEBUT CODE
 *******************************************************************************************/
/*****************************TRAITEMENT URL*************************************************/

var URL = document.location.href; //URL
var decodedURL = unescape(URL); //URL decodee (carateres speciaux du style %xx sont convertis en leur 'vrai' caratere)
var paramsArray = decodedURL.substring(decodedURL.indexOf("?") + 1).split("&"); //Recuperation de l'URL apres le ?, donc les parametres, decoupe a chaque '&'
var adress = ""; //Variable de l'adresse provenant de l'url
var dosID = ""; //Variable du numero de dossier prevenant de l'url

for(var i = 0, m = paramsArray.length; i < m; i++) //Pour chaque parametre (xxxxx=yyyyy)
{
	var valueArray = paramsArray[i].split("="); //On separe clef et valeur
	switch(valueArray[0]) //Switch selon la clef
	{
		case mapIDKey: //ID de map
			mapID = valueArray[1];
			break;
		case addressKey: //Adresse
			adress = valueArray[1].split("+").join(" "); //Convertis les caracteres HTML (%E7) en leur 'vrai' valeur et remplace les + par des espaces
			break;
		case idKey: //ID dossier
			dosID = valueArray[1];
			break;
		case countryKey: //Pays
			adress = adress + " " + valueArray[1]; //Ajout du pays a la fin de l'adresse
			break;
	}
}

/*****************************MAP*************************************************/

//On charge les differents modules souhaites et les passons en parametres de la fonction appelee lorsque tout a ete charge
require(["esri/map", "esri/IdentityManager", "esri/dijit/BasemapGallery", "esri/arcgis/utils", "esri/config", "esri/graphicsUtils", "esri/layers/GraphicsLayer", "esri/geometry/Point", "esri/dijit/Search", "esri/geometry/Extent", "esri/graphic", "esri/symbols/PictureMarkerSymbol", "esri/layers/FeatureLayer", "esri/InfoTemplate", "esri/tasks/query", "esri/Color", "dojo/cookie", "dojo/json", "dojo/on", "dojo/parser", "dojo/dom", "dojo/domReady!"], function(Map, EsriID, BasemapGallery, ArcgisUtils, esriConfig, GraphicsUtils, GraphicsLayer, Point, Search, Extent, Graphic, PictureMarkerSymbol, FeatureLayer, InfoTemplate, Query, Color, cookie, JSON, on, parser, dom)
	{
		var map; //La map
		var popup; //Infobulle
		var featureLayer; //Couche Feature
		var graphicsLayer; //Couche 'de dessin'
		var search; //Boite de recherche (n'est pas afichee)
		var infoTemplate; //Schema de presentation des donnees pour le featurelayer
		var point; //Le point ou placer le dossier
		var pin; //Le pointeur pour la couche graphique
		var cred = "TOKEN"; //La clef de stockage du token

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

		/**
		 * Initialise les parametres apres la creation de la map
		 *
		 * @param response La reponse du load map.
		 */
		function mapLoaded(response)
		{
			map = response.map; //Recuperation de la map cree

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

			var layers = map.getLayersVisibleAtScale(map.getScale()); //Recuperation des couches visibles
			for(var i = 0, c = layers.length; i < c; i++)
			{
				var layer = layers[i];
				if(layer.type && layer.type === "Feature Layer" && layer.capabilities && layer.capabilities.split(",").indexOf("Create") > -1 && layer.geometryType && layer.geometryType.includes("Point")) //Si c'est le FeatureLayer
				{
					initFeatureLayer(layer);
				}
			}
			if(!featureLayer)
			{
				alert(decodeHtml(noLayerText));
				return;
			}

			pin = createPictureSymbol("http://static.arcgis.com/images/Symbols/Shapes/OrangePin1LargeB.png", 0, 9, 27, 27); //Creation du pin pour positionner le dossier

			graphicsLayer = new GraphicsLayer(); //Creation de la couche de dessin
			map.addLayer(graphicsLayer); //Ajout de la couche

			search = new Search({
				map: map, maxSuggestions: 1
			}, searchDiv);
			search.startup(); //Creation et demarage du module de recherche (non visible)

			//Ajout des evenements
			map.on("click", clickMap); //Click sur la map

			dom.byId(idSearch).addEventListener("click", lancerRecherche); //Click sur le bouton de recherche d'adresse
			dom.byId(idValid).addEventListener("click", valid); //Click sur le bouton valider
			dom.byId(idLogout).addEventListener("click", logout); //Click sur le bouton de deconexion

			dom.byId(idAddress).addEventListener("keypress", adressKeyPressed); //Appui sur une touche de le champ d'adresse

			//Remplissage du paneau lateral
			dom.byId("dos").value = dosID;
			dom.byId("adr").value = adress;
			setInfoText(helpText, false);

			setTimeout(function()
			{
				//Lance une recherche
				lancerRecherche();
			}, 500);
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

		/**
		 * Si la touche entree est pressee dans le champ d'adresse, on lance une recherche.
		 *
		 * @param event L'evenement de la touche appuyee.
		 */
		function adressKeyPressed(event)
		{
			if(event.keyCode == 13)
				lancerRecherche();
		}

		/**
		 * Initialise le FeatureLayer (creation du schema de la boite d'info).
		 *
		 * @param layer Le FeatureLayer a initialiser.
		 */
		function initFeatureLayer(layer)
		{
			if(featureLayer)
			{
				return;
			}
			featureLayer = layer;
			infoTemplate = new InfoTemplate(infoTitle, infoBody); //Fenetre de presentation des resultats
			featureLayer.mode = FeatureLayer.MODE_ONDEMAND;
			featureLayer.outFields = [exportColumns]; // Colones a exporter pour l'affichage
			featureLayer.opacity = .90;
			featureLayer.infoTemplate = infoTemplate;
		}

		/**
		 * Ajoute un point, ou deplace l'ancien, par rapport a l'adresse dans le champ.
		 */
		function lancerRecherche()
		{
			addAdress(dom.byId(idAddress).value);
		}

		/**
		 * Met a jour le point a l'adresse donnee.
		 *
		 * @param adr L'adresse ou placer le point.
		 */
		function addAdress(adr)
		{
			if(!adr) //Si l'adresse est vide on arrete
			{
				return;
			}
			search.search(adr).then(function(result) //Recherche de l'adresse
			{
				if(!result || !result.results || result.results.length < 1 || result.results[0].length < 1) //Si il n'y a pas de resultat on arrete
				{
					return;
				}
				search.clear();
				point = result.results[0][0].extent.getCenter(); //On definit le point ou la recherche nous indique
				updateGraphics(); //On met a jour la couche graphique
			});
		}

		/**
		 * Place le point (ou modifie) a l'emplacement du clic.
		 *
		 * @param event L'evenement du click.
		 */
		function clickMap(event)
		{
			if(event.graphic)
			{
				return;
			}
			point = event.mapPoint;
			updateGraphics();

		}

		/**
		 * Met a jour la couche graphique.
		 */
		function updateGraphics()
		{
			graphicsLayer.clear();
			graphicsLayer.add(new Graphic(point, pin));
		}

		/**
		 * Fonction appelee lors du click sur le bouton valider.
		 *
		 * Verifie que tout est rempli et que l'ID n'est pas deja utilise.
		 */
		function valid()
		{
			if(!featureLayer)
			{
				return;
			}
			if(!dom.byId(idDos).value) //Si le champ ID est vide, on arrete
			{
				setInfoText(noIDText, true);
				return;
			}
			if(!point) //Si le point n'est pas defini, on arrete
			{
				setInfoText(noAddressText,true);
				return;
			}
			//Verification si le numero de dossier est deja utilise (Requete SQL sur cet ID)
			var query = new Query();
			query.where = "ID = " + dom.byId(idDos).value;
			featureLayer.selectFeatures(query, FeatureLayer.SELECTION_SUBTRACT, function(results)
			{
				if(results.length > 0) //Si le numero de dossier est deja pris (au moins un resultat de la requete) on arrete
				{
					setInfoText(IDTakenText, true);
					return;
				}
				var attr = {
					ID: dom.byId("dos").value
				}; //MOD: Creation des attributs du point
				graphicsLayer.clear(); //On efface nos points temporaires
				addPoint(point, attr); //Ajout du point dans la BDD
			});
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

		/**
		 * Genere un nombre aleatoire entre min et max.
		 *
		 * @param min Le minimum, inclus.
		 * @param max Le maximum, exclus.
		 * @returns {number} Un nombre aleatoire.
		 */
		function gen(min, max)
		{
			return Math.random() * max + min;
		}

		/**
		 * Genere un entier aleatoire entre min et max.
		 *
		 * @param min Le minimum, inclus.
		 * @param max Le maximum, exclus.
		 * @returns {number} Un entier aleatoire.
		 */
		function genF(min, max)
		{
			return Math.floor(gen(min, max));
		}

		/**
		 * Ajoute un point et ses attributs dans la base de donnee.
		 *
		 * @param coord Les coordonnees du point.
		 * @param attr Les attributs du point.
		 */
		function addPoint(coord, attr)
		{
			var addGraphic = new Graphic(coord, null, attr); //Creation de l'objet a envoyer au serveur

			featureLayer.applyEdits([addGraphic], null, null, function(result)
			{ //Ajout du point dans la BDD
				if(!result || result.length < 1) //Si aucun changement n'a ete fait, on sort
				{
					return;
				}
				var inBuffer = [];
				for(var i = 0, m = result.length; i < m; i++) //Recuperation des objectID des points ajoutes
				{
					inBuffer.push(result[i].objectId);
				}
				var query = new Query();
				query.objectIds = inBuffer;
				featureLayer.selectFeatures(query, FeatureLayer.SELECTION_NEW, function(results) //Recuperation des infos du point ajoute
				{
					if(results.length < 1)
					{
						return;
					}
					centerFeat(results); //Centre la map sur le point
					point = null;
					setInfoText(pointSetText, false);
					dom.byId(idDos).value = "";
					popup.setFeatures(results);
					setTimeout(function()
					{
						popup.show(results[0].geometry); //Affichage de la popup d'info du point
					}, 750);
				});
			}, function(error)
			{
				console.log(error);
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
