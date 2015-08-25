__author__ = 'tcouchoud'

import logging
import datetime

import arcpy

import ExpUtils as Utils

def log(message):
	print message
	logging.info(message)

class UtilsManif(Utils.Utils):
####################################################################################################################
	# Ajoute les donnees a la table
	def addEntriesDatabase(self, couche, entries, addPhoto, couchePics, pictureLabel, objectIDLabel, titleLabel, tempPictureDirectory, xLabel, yLabel):
		log('\nAjout des donnees a la base (' + str(len(entries)) + ' elements)...')
		addedTableKey = '__ADDEDTABLE__'
		i = 0
		for entry in entries:
			i += 1
			if xLabel in entry and yLabel in entry:
				log('\tEcriture donnee ' + str(i) + '/' + str(len(entries)) + ': ' + str(entry))
				entry[addedTableKey] = self.writeEntry(couche, entry, xLabel, yLabel)  # Ecriture du contenu
		if addPhoto:
			log('  Ajout des pieces jointes...')
			nb = 0
			i = 0
			for entry in entries:
				i += 1
				if addedTableKey in entry and entry[addedTableKey] and pictureLabel in entry and entry[pictureLabel] is not None and objectIDLabel in entry and titleLabel in entry and xLabel in entry and yLabel in entry:
					log('\t' + str(i) + '/' + str(len(entries)) + ' Telechargement des photos de ' + str(entry[objectIDLabel]))
					nb += self.downloadphoto(couchePics, entry, pictureLabel, objectIDLabel, titleLabel, tempPictureDirectory)  # Ecriture des pieces jointes
			log('  ' + str(nb) + ' pieces jointes ajoutees')

	# Ajoute les proprietees d'une entree dans la table
	def writeEntry(self, couche, entry, xLabel, yLabel):
		rows = arcpy.InsertCursor(couche)
		row = rows.newRow()
		now = datetime.datetime.today()
		for key, value in entry.iteritems():  # Pour chaque proprietee
			row.setValue(key[:self.maxFieldLength], value[:255])
			if key == 'PeriodeOuverture':
				try:
					champs = value.split('|')
					tim = champs[2]
					if tim == '':
						tim = '23:59'
					dat = datetime.datetime.strptime(champs[0] + ' ' + tim, '%d/%m/%Y %H:%M')
					if dat < now: #Si la date de fin est plus ancienne que celle actuelle on ajoute pas l'entree
						log('\t\tSKIP ' + str(dat))
						return False
				except BaseException:
					pass
		row.setValue('SHAPE', arcpy.Point(float(entry[xLabel]), float(entry[yLabel])))
		rows.insertRow(row)
		return True
