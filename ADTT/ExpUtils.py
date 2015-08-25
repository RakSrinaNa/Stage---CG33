__author__ = 'tcouchoud'

import time
import os
import sys
import random
import urllib2
import shutil
import xml.etree.ElementTree as ElementTree
import logging

import arcpy

# Permet de creer un repertoire
def createDirectory(path):
	if not os.path.exists(path):
		os.makedirs(path)
	return path

def log(message):
	print message
	logging.info(message)

class Utils:
####################################################################################################################
	def __init__(self):
		self.removenamespace = ['xml:base="http://wcf.tourinsoft.com/Syndication/cdt37/5c5731fb-55f5-4b78-ace7-532d84c0abf6/"',
	                   'xmlns="http://www.w3.org/2005/Atom"',
	                   'xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices"',
	                   'xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"',
	                   'm:',
	                   'd:']
		self.maxFieldLength = 20


	# Supprime une table
	def delTable(self, bddPath, name):
		if arcpy.Exists(os.path.join(bddPath, name)):
			arcpy.Delete_management(os.path.join(bddPath, name))

	# Cree une nouvelle table. Si celle-ci existe deja, elle est d'abord supprimee
	def createNewTabDelIfExists(self, bddPath, name):
		log('Recreation BDD ' + bddPath + '\\' + name)
		self.delTable(bddPath, name)
		arcpy.CreateFileGDB_management(bddPath, name)

	# Cree une table de pieces jointes
	def createNewPhotoTable(self, bddPath, name):
		self.delTable(bddPath, name)
		dbfp = arcpy.CreateTable_management(bddPath, name)
		arcpy.AddField_management(dbfp, 'objid', 'TEXT')
		arcpy.AddField_management(dbfp, 'title', 'TEXT')
		arcpy.AddField_management(dbfp, 'img', 'TEXT')
		return dbfp

	# Cree un fichier temporaire avec son contenu
	def createTempXMLFile(self, tempDirectory, preName, fileContent):
		for v in self.removenamespace:
			fileContent = fileContent.replace(v, '')
		filePath = os.path.join(tempDirectory, preName + '_' + str(random.randint(1, 9999999999)) + '.xml')
		if arcpy.Exists(filePath):
			arcpy.Delete_management(filePath)
		tempFile = open(filePath, 'a')
		tempFile.write(fileContent)
		tempFile.write('\n')
		tempFile.close()
		log('\nFichier XML intermediaire cree: ' + filePath)
		return filePath

	# Recupere les entrees
	def getEntries(self, tempDirectory, url, xPath, propertiesXPath):
		log('\nRecuperation des entrees')
		entries = []
		fileXML = self.createTempXMLFile(tempDirectory, 'Entries', urllib2.urlopen(url + '/Objects').read())
		rss = ElementTree.parse(fileXML)
		root = rss.getroot()
		for entryXML in root.findall(xPath):  # Pour chaque entree
			entry = dict()
			for elementProperty in entryXML.findall(propertiesXPath + '/*'):
				if elementProperty.text is not None:
					entry[elementProperty.tag] = elementProperty.text  # On ajoute une entree (clef, valeur) dans le dictionnaire
			entries.append(entry)
		os.remove(fileXML)
		return entries

	# Ajoute les chanps des entrees a la table
	def addEntriesFieldsDatabase(self, bddPath, entries, customEntries):
		log('\nAjout entrees table...')
		try:
			fields = []
			for entry in entries:
				fields.extend(entry.keys())
			for key in set(fields):
				if customEntries and key in customEntries:
					log('\tAjout entree "' + key + '" du type ' + customEntries[key])
					arcpy.AddField_management(bddPath, key[:self.maxFieldLength], customEntries[key])
				else:
					log('\tAjout entree "' + key + '"')
					arcpy.AddField_management(bddPath, key[:self.maxFieldLength], 'TEXT')
			log('Entrees crees')
		except IndexError:
			pass

	# Ajoute les donnees a la table
	def addEntriesDatabase(self, couche, entries, addPhoto, couchePics, pictureLabel, objectIDLabel, titleLabel, tempPictureDirectory, xLabel, yLabel):
		log('\nAjout des donnees a la base (' + str(len(entries)) + ' elements)...')
		for entry in entries:
			if xLabel in entry and yLabel in entry:
				self.writeEntry(couche, entry, xLabel, yLabel)  # Ecriture du contenu
		if addPhoto:
			log('  Ajout des pieces jointes...')
			nb = 0
			i = 0
			for entry in entries:
				i += 1
				if pictureLabel in entry and entry[pictureLabel] is not None and objectIDLabel in entry and titleLabel in entry and xLabel in entry and yLabel in entry:
					log('\t' + str(i) + '/' + str(len(entries)) + ' Telechargement des photos de ' + str(entry[objectIDLabel]))
					nb += self.downloadphoto(couchePics, entry, pictureLabel, objectIDLabel, titleLabel, tempPictureDirectory)  # Ecriture des pieces jointes
			log('  ' + str(nb) + ' pieces jointes ajoutees')

	# Ajoute les proprietees d'une entree dans la table
	def writeEntry(self, couche, entry, xLabel, yLabel):
		log('\tEcriture donnee : ' + str(entry))
		rows = arcpy.InsertCursor(couche)
		row = rows.newRow()
		for key, value in entry.iteritems():  # Pour chaque proprietee
			row.setValue(key[:self.maxFieldLength], value[:255])
		row.setValue('SHAPE', arcpy.Point(float(entry[xLabel]), float(entry[yLabel])))
		rows.insertRow(row)

	# Ajoute les photos a la tables des pieces jointes
	def downloadphoto(self, couche, entry, pictureLabel, objectIDLabel, titleLabel, tempPictureDirectory):
		if not couche or couche == '':
			return
		tmp = entry[pictureLabel].split('#')
		i = 0
		for val in tmp:  # pour chaque lien
			try:
				positionHTTP = val.lower().index('http')
				positionJPG = val.lower().index('.jpg')
				urlphoto = val[positionHTTP:positionJPG + 4]
				i += 1
				objid = entry[objectIDLabel]
				title = entry[titleLabel]
				imgPath = os.path.join(tempPictureDirectory, str(objid) + "_" + str(i) + ".jpg")
				log('\t\tTelechargement de ' + urlphoto + ' sous ' + imgPath)

				# urllib.urlretrieve(urlphoto, os.path.join(cheminshpoutputtmp, "photos", imgPath))

				jpgfile = urllib2.urlopen(urlphoto)
				output = open(imgPath, 'wb')
				output.write(jpgfile.read())
				output.close()

				rows = arcpy.InsertCursor(couche)
				row = rows.newRow()
				row.setValue('objid', objid[:255])
				row.setValue('title', title[:255])
				row.setValue('img', imgPath)
				rows.insertRow(row)
			except ValueError:
				pass
		return len(tmp)

	# Enleve les colonnes et lignes d'une table
	def emptyTable(self, table):
		atttable = str(table) + '__ATTACH'
		if arcpy.Exists(table):
			log('\tVidage de la table ' + table)
			arcpy.TruncateTable_management(table)
			if arcpy.Exists(atttable):
				log('\t\tVidage de la table des pieces jointes ' + str(atttable))
				arcpy.TruncateTable_management(atttable)

	# Copie la structure d'une table vers une autre
	def copyStructure(self, base, to):
		if arcpy.Exists(base) and arcpy.Exists(to):
			log('\tCopie de la structure de ' + str(base) + ' vers ' + str(to))
			fields = arcpy.ListFields(base)
			fields2 = arcpy.ListFields(to)
			for field in fields:
				if field.name != 'OBJECTID' and field.name != 'SHAPE' and field.name != 'Shape' and not field in fields2:
					try:
						arcpy.AddField_management(to, field.name, field.type)
					except BaseException:
						pass

	# Effectue une reprojection vers une nouvelle table
	def reprojection(self, base, refBase, to, refTo, mode):
		log('\tReprojection de ' + str(base) + ' vers ' + str(to))
		if arcpy.Exists(to):
			arcpy.Delete_management(to)
		try:
			arcpy.Project_management(base, to, refTo, mode, refBase)
		except BaseException as e:
			log(str(e))

	# Copie les donnees d'une table vers une autre
	def copyData(self, base, to, addPhoto, basePhoto, objectIDLabel):
		log('\tCopie de ' + str(base) + ' vers ' + str(to))
		if not arcpy.Exists(to):
			try:
				arcpy.Copy_management(base, to)
			except BaseException as e:
				log(e)
		else:
			arcpy.Append_management(base, to, "TEST", "", "")
		if addPhoto and basePhoto and basePhoto != '':
			arcpy.EnableAttachments_management(to)
			arcpy.AddAttachments_management(to, objectIDLabel, basePhoto, 'objid', "img", "#")

	# Copy la couche temporaire a sa destination finale
	def copyCouche(self, base, toTemp, to, refBase, refTo, addPhoto, basePhoto, objectIDLabel, mode):
		if arcpy.Exists(base):
			log('\nCopie de la couche ' + str(base) + ' vers ' + str(to) + ' (' + str(basePhoto) + ')')
			self.emptyTable(to)
			self.copyStructure(base, to)
			self.reprojection(base, refBase, toTemp, refTo, mode)
			self.copyData(toTemp, to, addPhoto, basePhoto, objectIDLabel)

	# Le chef d'orchestre
	def export(self, url, tempBddName, addPhoto, tempPicsBddName, cheminOutputCC47, prjInput, prjOutput, tempDir, tempPictureDir, proxyURL, entryXPath, elementPropertiesXPath, pictureLabel, objectIDLabel, titleLabel, xLabel, yLabel, projectionMethod, customEntries = None):
		start = time.time()

		log('Fichier log infos:\n\tURL: ' + str(url) + '\n\tOutput: ' + str(cheminOutputCC47) + '\n')

		# Creation des dossiers temporarires
		tempDirectory = createDirectory(tempDir)
		tempPictureDirectory = createDirectory(os.path.join(tempDirectory, tempPictureDir))

		# Ajout du proxy si celui-ci est renseigne
		if proxyURL is not None and proxyURL != '':
			proxy_support = urllib2.ProxyHandler({"http": proxyURL})
			opener = urllib2.build_opener(proxy_support)
			urllib2.install_opener(opener)

		# Creation de la table temporaire
		self.createNewTabDelIfExists(tempDirectory, tempBddName)
		coucheOutputTmp = arcpy.CreateFeatureclass_management(os.path.join(tempDirectory, tempBddName), 'point', 'POINT')
		arcpy.EnableAttachments_management(coucheOutputTmp)  # Activation des pieces jointes

		coucheOutputTmp2 = arcpy.CreateFeatureclass_management(os.path.join(tempDirectory, tempBddName), 'point2', 'POINT')
		arcpy.EnableAttachments_management(coucheOutputTmp2)

		# Creation de la table pour les pieces jointes
		coucheOutputPics = ''
		if addPhoto:
			coucheOutputPics = self.createNewPhotoTable(tempDirectory, tempPicsBddName)

		log('\n--- DEBUT ---')
		entries = self.getEntries(tempDirectory, url, entryXPath, elementPropertiesXPath)  # Recuperation des entrees
		self.addEntriesFieldsDatabase(coucheOutputTmp, entries, customEntries)  # Creation du schema de la table
		self.addEntriesDatabase(coucheOutputTmp, entries, addPhoto, coucheOutputPics, pictureLabel, objectIDLabel, titleLabel, tempPictureDirectory, xLabel, yLabel)  # Ajout des entrees a la table
		self.copyCouche(coucheOutputTmp, coucheOutputTmp2, cheminOutputCC47, prjInput, prjOutput, addPhoto, coucheOutputPics, objectIDLabel, projectionMethod)  # Copie la table temporaire dans la table finale

		# Suppression des donnees temporarires
		self.delTable(tempDirectory, tempBddName)
		if addPhoto:
			self.delTable(tempDirectory, tempPicsBddName)
		try:
			shutil.rmtree(tempDirectory)
		except:
			log('Le dossier ' + tempDirectory + ' n\'a pas pu etre supprime')
		log('\n--- FIN (' + str(round(time.time() - start, 3)) + 's) ---')
