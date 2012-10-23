package be.cytomine

import be.cytomine.image.ImageInstance
import be.cytomine.ontology.AlgoAnnotation
import be.cytomine.ontology.AlgoAnnotationTerm
import be.cytomine.ontology.Ontology
import be.cytomine.project.Project
import be.cytomine.security.User
import be.cytomine.security.UserJob
import be.cytomine.test.BasicInstance
import be.cytomine.test.Infos
import be.cytomine.test.http.AlgoAnnotationAPI
import be.cytomine.test.http.DomainAPI
import grails.converters.JSON
import org.codehaus.groovy.grails.web.json.JSONArray
import org.codehaus.groovy.grails.web.json.JSONObject
import be.cytomine.test.http.AnnotationDomainAPI
import be.cytomine.ontology.UserAnnotation
import be.cytomine.test.http.UserAnnotationAPI
import be.cytomine.ontology.AnnotationTerm

/**
 * Created by IntelliJ IDEA.
 * User: lrollus
 * Date: 8/02/11
 * Time: 9:01
 * To change this template use File | Settings | File Templates.
 */
class GenericAnnotationTests extends functionaltestplugin.FunctionalTestCase {

    void testGetAnnotationWithCredentialWithaAnnotationAlgo() {
        def annotation = BasicInstance.createOrGetBasicAlgoAnnotation()
        def result = AnnotationDomainAPI.show(annotation.id, Infos.GOODLOGIN,Infos.GOODPASSWORD)
        assertEquals(200, result.code)
        def json = JSON.parse(result.data)
        assert json instanceof JSONObject
    }

    void testGetAnnotationWithCredentialWidthAnnotationUser() {
        def annotation = BasicInstance.createOrGetBasicUserAnnotation()
        def result = AnnotationDomainAPI.show(annotation.id, Infos.GOODLOGIN,Infos.GOODPASSWORD)
        assertEquals(200, result.code)
        def json = JSON.parse(result.data)
        assert json instanceof JSONObject
    }



    void testListAnnotationByProjecImageAndUsertWithCredentialWithAnnotationAlgo() {
        AlgoAnnotation annotation = BasicInstance.createOrGetBasicAlgoAnnotation()
        def result = AnnotationDomainAPI.listByProject(annotation.project.id, annotation.user.id, annotation.image.id, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(200, result.code)
        def json = JSON.parse(result.data)
        assert json instanceof JSONArray
    }

    void testListAnnotationByProjecImageAndUsertWithCredentialWidthAnnotationUser() {
        UserAnnotation annotation = BasicInstance.createOrGetBasicUserAnnotation()
        def result = AnnotationDomainAPI.listByProject(annotation.project.id, annotation.user.id, annotation.image.id, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(200, result.code)
        def json = JSON.parse(result.data)
        assert json instanceof JSONArray
    }


    void testListAnnotationByImageAndUserWithCredentialWithAnnotationAlgo() {
        AlgoAnnotation annotation = BasicInstance.createOrGetBasicAlgoAnnotation()
        def result = AnnotationDomainAPI.listByImageAndUser(annotation.image.id, annotation.user.id, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(200, result.code)
        def json = JSON.parse(result.data)
        assert json instanceof JSONArray
    }

    void testListAnnotationByImageAndUserWithCredentialWithAnnotationUser() {
        UserAnnotation annotation = BasicInstance.createOrGetBasicUserAnnotation()
        def result = AnnotationDomainAPI.listByImageAndUser(annotation.image.id, annotation.user.id, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(200, result.code)
        def json = JSON.parse(result.data)
        assert json instanceof JSONArray
    }


    void testListAnnotationByProjectAndTermAndUserWithCredentialForAnnotationAlgo() {
        AlgoAnnotationTerm annotationTerm = BasicInstance.createOrGetBasicAlgoAnnotationTermForAlgoAnnotation()
        Infos.addUserRight(Infos.GOODLOGIN,annotationTerm.retrieveAnnotationDomain().project)
        def result = AnnotationDomainAPI.listByProjectAndTerm(annotationTerm.retrieveAnnotationDomain().project.id, annotationTerm.term.id, annotationTerm.retrieveAnnotationDomain().user.id,Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(200, result.code)
        def json = JSON.parse(result.data)
        //assert json instanceof JSONArray
    }

    void testListAnnotationByProjectAndTermAndUserWithCredentialForAnnotationUser() {
        AnnotationTerm annotationTerm = BasicInstance.createOrGetBasicAnnotationTerm()
        Infos.addUserRight(Infos.GOODLOGIN,annotationTerm.userAnnotation.project)
        def result = AnnotationDomainAPI.listByProjectAndTerm(annotationTerm.userAnnotation.project.id, annotationTerm.term.id, annotationTerm.userAnnotation.user.id,Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(200, result.code)
        def json = JSON.parse(result.data)
        //assert json instanceof JSONArray
    }


    void testListAnnotationByProjectAndTermAndUserAndImageWithCredentialForAnnotationAlgo() {
        AlgoAnnotationTerm annotationTerm = BasicInstance.createOrGetBasicAlgoAnnotationTermForAlgoAnnotation()
        Infos.addUserRight(Infos.GOODLOGIN,annotationTerm.retrieveAnnotationDomain().project)
        def result = AnnotationDomainAPI.listByProjectAndTerm(annotationTerm.retrieveAnnotationDomain().project.id, annotationTerm.term.id, annotationTerm.retrieveAnnotationDomain().user.id,annotationTerm.retrieveAnnotationDomain().image.id,Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(200, result.code)
        def json = JSON.parse(result.data)
        //assert json instanceof JSONArray
    }

    void testListAnnotationByProjectAndTermAndUserAndImageWithCredentialForAnnotationUser() {
        AnnotationTerm annotationTerm = BasicInstance.createOrGetBasicAnnotationTerm()
        Infos.addUserRight(Infos.GOODLOGIN,annotationTerm.userAnnotation.project)
        def result = AnnotationDomainAPI.listByProjectAndTerm(annotationTerm.userAnnotation.project.id, annotationTerm.term.id, annotationTerm.userAnnotation.user.id,annotationTerm.userAnnotation.image.id,Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(200, result.code)
        def json = JSON.parse(result.data)
        //assert json instanceof JSONArray
    }

    void testDownloadAnnotationDocumentForAnnotationAlgo() {
        AlgoAnnotationTerm annotationTerm = BasicInstance.createOrGetBasicAlgoAnnotationTermForAlgoAnnotation()
        def result = AnnotationDomainAPI.downloadDocumentByProject(annotationTerm.retrieveAnnotationDomain().project.id,annotationTerm.retrieveAnnotationDomain().user.id,annotationTerm.term.id, annotationTerm.retrieveAnnotationDomain().image.id, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(200, result.code)
    }

    void testDownloadAnnotationDocumentForAnnotationUser() {
        AnnotationTerm annotationTerm = BasicInstance.createOrGetBasicAnnotationTerm()
        def result = AnnotationDomainAPI.downloadDocumentByProject(annotationTerm.userAnnotation.project.id,annotationTerm.userAnnotation.user.id,annotationTerm.term.id, annotationTerm.userAnnotation.image.id, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(200, result.code)
    }

    void testAddAnnotationCorrectForAlgo() {
        def annotationToAdd = BasicInstance.createOrGetBasicAlgoAnnotation()
        UserJob user = annotationToAdd.user
        try {Infos.addUserRight(user.user.username,annotationToAdd.project)} catch(Exception e) {println e}
        def result = AnnotationDomainAPI.create(annotationToAdd.encodeAsJSON(),user.username, 'PasswordUserJob')
        assertEquals(200, result.code)
        int idAnnotation = result.data.id

        result = AnnotationDomainAPI.show(idAnnotation, user.username, 'PasswordUserJob')
        assertEquals(200, result.code)

        result = AnnotationDomainAPI.undo(user.username, 'PasswordUserJob')
        assertEquals(200, result.code)

        result = AnnotationDomainAPI.show(idAnnotation, user.username, 'PasswordUserJob')
        assertEquals(404, result.code)

        result = AnnotationDomainAPI.redo(user.username, 'PasswordUserJob')
        assertEquals(200, result.code)

        result = AnnotationDomainAPI.show(idAnnotation, user.username, 'PasswordUserJob')
        assertEquals(200, result.code)
    }

    void testAddAnnotationCorrectForUser() {
        def annotationToAdd = BasicInstance.createOrGetBasicUserAnnotation()
        def result = AnnotationDomainAPI.create(annotationToAdd.encodeAsJSON(), Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(200, result.code)
        int idAnnotation = result.data.id

        result = AnnotationDomainAPI.show(idAnnotation, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(200, result.code)

        result = AnnotationDomainAPI.undo()
        assertEquals(200, result.code)

        result = AnnotationDomainAPI.show(idAnnotation, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(404, result.code)

        result = AnnotationDomainAPI.redo()
        assertEquals(200, result.code)

        result = AnnotationDomainAPI.show(idAnnotation, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(200, result.code)
    }

    void testEditAnnotationWithGenericCallForAlgo() {
        AlgoAnnotation annotationToAdd = BasicInstance.createOrGetBasicAlgoAnnotation()
        UserJob user = annotationToAdd.user
        try {Infos.addUserRight(user.user.username,annotationToAdd.project)} catch(Exception e) {println e}

        def result = AnnotationDomainAPI.update(annotationToAdd, user.username, Infos.GOODPASSWORDUSERJOB)
        assertEquals(200, result.code)
        def json = JSON.parse(result.data)
        assert json instanceof JSONObject
        int idAnnotation = json.annotation.id

        def showResult = AnnotationDomainAPI.show(idAnnotation, user.username, Infos.GOODPASSWORDUSERJOB)
        json = JSON.parse(showResult.data)
        BasicInstance.compareAnnotation(result.mapNew, json)

        showResult = AnnotationDomainAPI.undo(user.username, Infos.GOODPASSWORDUSERJOB)
        assertEquals(200, result.code)
        showResult = AnnotationDomainAPI.show(idAnnotation, user.username, Infos.GOODPASSWORDUSERJOB)
        BasicInstance.compareAnnotation(result.mapOld, JSON.parse(showResult.data))

        showResult = AnnotationDomainAPI.redo(user.username, Infos.GOODPASSWORDUSERJOB)
        assertEquals(200, result.code)
        showResult = AnnotationDomainAPI.show(idAnnotation, user.username, Infos.GOODPASSWORDUSERJOB)
        BasicInstance.compareAnnotation(result.mapNew, JSON.parse(showResult.data))
    }

    void testEditAnnotationWithGenericCallForUser() {
        UserAnnotation annotationToAdd = BasicInstance.createOrGetBasicUserAnnotation()
        def result = AnnotationDomainAPI.update(annotationToAdd, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(200, result.code)
        def json = JSON.parse(result.data)
        assert json instanceof JSONObject
        int idAnnotation = json.annotation.id

        def showResult = AnnotationDomainAPI.show(idAnnotation, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        json = JSON.parse(showResult.data)
        BasicInstance.compareAnnotation(result.mapNew, json)

        showResult = AnnotationDomainAPI.undo()
        assertEquals(200, result.code)
        showResult = AnnotationDomainAPI.show(idAnnotation, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        BasicInstance.compareAnnotation(result.mapOld, JSON.parse(showResult.data))

        showResult = AnnotationDomainAPI.redo()
        assertEquals(200, result.code)
        showResult = AnnotationDomainAPI.show(idAnnotation, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        BasicInstance.compareAnnotation(result.mapNew, JSON.parse(showResult.data))
    }


    void testDeleteAnnotationForAlgo() {
        def annotationToDelete = BasicInstance.getBasicAlgoAnnotationNotExist()
        assert annotationToDelete.save(flush: true)  != null
        UserJob user = annotationToDelete.user
        try {Infos.addUserRight(user.user.username,annotationToDelete.project)} catch(Exception e) {println e}

        def id = annotationToDelete.id
        def result = AnnotationDomainAPI.delete(id, user.username, 'PasswordUserJob')
        assertEquals(200, result.code)

        def showResult = AnnotationDomainAPI.show(id, user.username,'PasswordUserJob')
        assertEquals(404, showResult.code)

        result = AnnotationDomainAPI.undo(user.username, 'PasswordUserJob')
        assertEquals(200, result.code)

        result = AnnotationDomainAPI.show(id, user.username,'PasswordUserJob')
        assertEquals(200, result.code)

        result = AnnotationDomainAPI.redo(user.username, 'PasswordUserJob')
        assertEquals(200, result.code)

        result = AnnotationDomainAPI.show(id, user.username,'PasswordUserJob')
        assertEquals(404, result.code)
    }

    void testDeleteUserAnnotationForUser() {
        def annotationToDelete = BasicInstance.getBasicUserAnnotationNotExist()
        assert annotationToDelete.save(flush: true)  != null
        def id = annotationToDelete.id
        def result = AnnotationDomainAPI.delete(id, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(200, result.code)

        def showResult = AnnotationDomainAPI.show(id, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(404, showResult.code)

        result = AnnotationDomainAPI.undo()
        assertEquals(200, result.code)

        result = AnnotationDomainAPI.show(id, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(200, result.code)

        result = AnnotationDomainAPI.redo()
        assertEquals(200, result.code)

        result = AnnotationDomainAPI.show(id, Infos.GOODLOGIN, Infos.GOODPASSWORD)
        assertEquals(404, result.code)
    }

}