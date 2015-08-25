import urllib2

__author__ = 'tcouchoud'

import arcpy
import json
import urllib
import re

class Toolbox(object):
	def __init__(self):
		self.label = "LaGodBox"
		self.alias = ""
		self.tools = [GeocodeAddressDataGouvInfo]


class GeocodeAddressDataGouvInfo(object):
	def __init__(self):
		self.label = "DataGouvInfoGeocodeWGS84"
		self.description = "Geocode une adresse grace a l'API adresse.data.gouv.fr"
		self.canRunInBackground = False

	def getParameterInfo(self):
		param0 = arcpy.Parameter(displayName="Table en entree",name="in_features",datatype="DETable",parameterType="Required",direction="Input")
		param1 = arcpy.Parameter(displayName="Champ adresse",name="address",datatype="GPString",parameterType="Required",direction="Input")
		param2 = arcpy.Parameter(displayName="Champ ville",name="city",datatype="GPString",parameterType="Required",direction="Input")
		param3 = arcpy.Parameter(displayName="Champ code postal",name="zip",datatype="GPString",parameterType="Required",direction="Input")
		param4 = arcpy.Parameter(displayName="Champ pays",name="country",datatype="GPString",parameterType="Optional",direction="Input")
		param5 = arcpy.Parameter(displayName="Table de sortie",name="out_features",datatype="GPFeatureLayer",parameterType="Required",direction="Output")
		param6 = arcpy.Parameter(displayName="Reprojetter en Lambert93CC47?",name="ref_output",datatype="GPBoolean",parameterType="Optional",direction="Output")
		param6.defaultEnvironmentName = True
		params = [param0, param1, param2, param3, param4, param5, param6]
		return params

	def isLicensed(self):
		return True

	def updateParameters(self, parameters):
		return

	def updateMessages(self, parameters):
		return

	def getAddressPoint(self, address, city, zipCode, country, messages):
		if address is None or city is None or zipCode is None:
			return None
		addr = address + ' ' + city + ' ' + country
		messages.addMessage('Obtention des coordonnees pour l\'adresse ' + addr)
		endpoint = 'http://api-adresse.data.gouv.fr'
		endpointSearch = endpoint + '/search/'
		params = urllib.urlencode({'limit': 1, 'postcode': zipCode, 'q': (re.sub(' +',' ',addr).encode("utf8")).strip()})
		con = urllib2.urlopen(endpointSearch + '?' + str(params))
		data = con.read()
		con.close()

		x = 0
		y = 0

		js = json.loads(data)
		if 'features' in js:
			features = js['features']
			if len(features) > 0:
				feature = features[0]
				if 'geometry' in feature:
					geometry = feature['geometry']
					if 'coordinates' in geometry:
						coordinates = geometry['coordinates']
						if len(coordinates) == 2:
							x = coordinates[0]
							y = coordinates[1]
		if x == 0 and y == 0:
			messages.addWarningMessage('L\'adresse n\'a pas renvoye de coordonnees valides (0 ,0)')
			return None
		return arcpy.Point(x, y)

	def getParam(self, index, parameters, default):
		if parameters[index] is None or parameters[index].valueAsText is None:
			return default
		return parameters[index].valueAsText

	def execute(self, parameters, messages):
		proxyURL = 'http://132.1.10.230'
		proxyPort = 8080

		if proxyURL is not None and proxyURL != '':
				proxy_support = urllib2.ProxyHandler({"http": proxyURL + ':' + str(proxyPort)})
				opener = urllib2.build_opener(proxy_support)
				urllib2.install_opener(opener)


		in_table = self.getParam(0, parameters, '')
		address = self.getParam(1, parameters, '')
		city = self.getParam(2, parameters, '')
		zipCode = self.getParam(3, parameters, '')
		country = self.getParam(4, parameters, '')
		out_feature_class = self.getParam(5, parameters, '')
		out_feature_path = out_feature_class[:out_feature_class.rfind('\\')]
		out_feature_name = out_feature_class[out_feature_class.rfind('\\') + 1:]
		refOut = self.getParam(6, parameters, False)
		messages.addMessage('Table d\'entree: ' + in_table)
		messages.addMessage('Champ adresse: ' + address)
		messages.addMessage('Champ ville: ' + city)
		messages.addMessage('Champ code postal: ' + zipCode)
		messages.addMessage('Champ pays: ' + country)
		messages.addMessage('Couche de sortie: ' + out_feature_class)
		messages.addMessage('Chemin de la couche de sortie: ' + out_feature_path)
		messages.addMessage('Nom de la couche de sortie: ' + out_feature_name)
		messages.addMessage('L93CC47: ' + str(refOut))

		if not arcpy.Exists(in_table):
			messages.addErrorMessage('Table d\'entree inexistante (' + in_table + ')')
			return

		if arcpy.Exists(out_feature_class):
			messages.addErrorMessage('Couche de sortie deja existante (' + out_feature_class + ')')
			return

		ref = arcpy.SpatialReference(4326) # Projection WGS84
		#ref = arcpy.SpatialReference(2154) #Projection L93
		ref2 = arcpy.SpatialReference(3947) # Projection L93CC47
		modeReproj = 'RGF_1993_To_WGS_1984_1'
		if refOut:
			out_feature_name += '_'
		coucheOutput = arcpy.CreateFeatureclass_management(out_feature_path, out_feature_name, 'POINT', spatial_reference=ref)

		fields = arcpy.ListFields(in_table)

		try:
			for field in fields:
				if field.name != 'OBJECTID' and field.name != 'SHAPE' and field.name != 'Shape':
					arcpy.AddField_management(coucheOutput, field.name, field.type)
		except IndexError:
			pass

		errors = []
		rowsOutput = arcpy.InsertCursor(coucheOutput)
		try:
			for rowInput in arcpy.SearchCursor(in_table):
				rowOutput = rowsOutput.newRow()
				for field in fields:
					if field.name != 'OBJECTID' and field.name != 'SHAPE' and field.name != 'Shape':
						rowOutput.setValue(field.name, rowInput.getValue(field.name))
				ad = rowInput.getValue(address)
				ct = rowInput.getValue(city)
				zp = rowInput.getValue(zipCode)
				cy = ''
				if country is None or country == '':
					try:
						cy = rowInput.getValue(country)
					except RuntimeError:
						pass
				point = self.getAddressPoint(ad, ct, zp, cy, messages)
				if point is not None:
					rowOutput.setValue('SHAPE', point)
					rowsOutput.insertRow(rowOutput)
				else:
					di = dict()
					di['Adresse'] = ad
					di['Ville'] = ct
					di['CodePostal'] = zp
					di['Pays'] = cy
					errors.append(di)
		except RuntimeError as e:
			messages.addErrorMessage('Erreur durant le traitement des donnees. Les champs d\'adresses sont ils correstes?\n' + str(e))
		if len(errors) > 0:
			messages.addErrorMessage('Erreur avec les adresses suivantes (celles-ci ne sont pas presentes dans la table de sortie):\n' + str(errors))
		if refOut:
			messages.addMessage('Reprojection de le referentiel L93CC7')
			arcpy.Project_management(out_feature_class + '_', out_feature_class, ref2, modeReproj, ref)
			arcpy.Delete_management(out_feature_class + '_')
		return