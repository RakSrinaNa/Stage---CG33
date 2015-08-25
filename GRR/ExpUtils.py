__author__ = 'tcouchoud'

import time
import os
import urllib2
import shutil
import logging
import MySQLdb
import datetime
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

	# Ajoute les chanps des entrees a la table
	def addEntriesFieldsDatabase(self, bddPath):
		log('\nAjout entrees table...')
		try:
			fields = dict()
			fields['id_resa'] = 'LONG'
			fields['start_time'] = 'TEXT'
			fields['end_time'] = 'TEXT'
			fields['room_id'] = 'LONG'
			for key, val in fields.iteritems():
				log('\tAjout entree "' + key + '"')
				arcpy.AddField_management(bddPath, key[:self.maxFieldLength], val)
			log('Entrees crees')
		except IndexError:
			pass

	# Ajoute les donnees a la table
	def addEntriesDatabase(self, couche, entries, idLabel, startLabel, endLabel, roomIdLabel):
		log('\nAjout des donnees a la base (' + str(len(entries)) + ' elements)...')
		i = 0
		for entry in entries:
			i += 1
			if idLabel in entry and startLabel in entry and endLabel in entry and roomIdLabel in entry:
				log('\t' + str(i) + '/' + str(len(entries)) + ' - Ecriture donnee : ' + str(entry))
				self.writeEntry(couche, entry, startLabel, endLabel)  # Ecriture du contenu

	# Ajoute les proprietees d'une entree dans la table
	def writeEntry(self, couche, entry, startLabel, endLabel):
		rows = arcpy.InsertCursor(couche)
		row = rows.newRow()
		for key, value in entry.iteritems():  # Pour chaque proprietee
			if key == startLabel or key == endLabel:
				date = datetime.datetime.fromtimestamp(value).strftime('%Y%m%d%H%M%S')
				row.setValue(key[:self.maxFieldLength], str(date))
			else:
				row.setValue(key[:self.maxFieldLength], value)
		rows.insertRow(row)

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
	def copyData(self, base, to):
		log('\tCopie de ' + str(base) + ' vers ' + str(to))
		if not arcpy.Exists(to):
			try:
				arcpy.Copy_management(base, to)
			except BaseException as e:
				log(e)
		else:
			arcpy.Append_management(base, to, "TEST", "", "")

	# Copy la couche temporaire a sa destination finale
	def copyCouche(self, base, to):
		if arcpy.Exists(base):
			log('\nCopie de la couche ' + str(base) + ' vers ' + str(to))
			self.emptyTable(to)
			self.copyStructure(base, to)
			self.copyData(base, to)

	def getEntries(self, url, user, password, bdd, table, idLabel, startLabel, endLabel, roomIdLabel):
		log('Recuperation des donnees...')
		entries = []
		db = MySQLdb.connect(host=url, user=user, passwd=password, db=bdd)

		cur = db.cursor()
		cur.execute('SELECT ' + idLabel + ','  + startLabel + ',' + endLabel + ',' + roomIdLabel + ' FROM ' + table + ' WHERE ' + startLabel + ' >= UNIX_TIMESTAMP(NOW()) AND ' + startLabel + ' <= UNIX_TIMESTAMP(DATE_ADD(NOW(),INTERVAL 1 MONTH));')
		for row in cur.fetchall():
			log(str(row))
			ent = dict()
			ent['id_resa'] = row[0]
			ent['start_time'] = row[1]
			ent['end_time'] = row[2]
			ent['room_id'] = row[3]
			entries.append(ent)
		db.close()
		return entries

	# Le chef d'orchestre
	def export(self, url, tempBddName, tempDir, user, password, bdd, table, cheminOutputCC47, proxyURL, idLabel, startLabel, endLabel, roomIdLabel):
		start = time.time()

		log('Fichier log infos:\n\tBDD: ' + str(url) + '/' + str(table) + '\n\tOutput: ' + str(cheminOutputCC47) + '\n')

		# Creation des dossiers temporarires
		tempDirectory = createDirectory(tempDir)

		# Ajout du proxy si celui-ci est renseigne
		if proxyURL is not None and proxyURL != '':
			proxy_support = urllib2.ProxyHandler({"http": proxyURL})
			opener = urllib2.build_opener(proxy_support)
			urllib2.install_opener(opener)

		# Creation de la table temporaire
		self.createNewTabDelIfExists(tempDirectory, 'TEST.gdb')
		coucheOutputTmp = arcpy.CreateTable_management(os.path.join(tempDirectory, 'TEST.gdb'), 'entry',)

		log('\n--- DEBUT ---')
		entries = self.getEntries(url, user, password, bdd, table, idLabel, startLabel, endLabel, roomIdLabel)
		self.addEntriesFieldsDatabase(coucheOutputTmp)  # Creation du schema de la table
		self.addEntriesDatabase(coucheOutputTmp, entries, 'id_resa', 'start_time', 'end_time', 'room_id')  # Ajout des entrees a la table
		self.copyCouche(coucheOutputTmp, cheminOutputCC47)  # Copie la table temporaire dans la table finale

		self.delTable(tempDirectory, tempBddName)
		try:
			shutil.rmtree(tempDirectory)
		except:
			log('Le dossier ' + tempDirectory + ' n\'a pas pu etre supprime')
		log('\n--- FIN (' + str(round(time.time() - start, 3)) + 's) ---')
