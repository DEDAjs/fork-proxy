
const assert = require("assert");

const Utility = require("../src/Utility.js");

describe("Utility.flattenObject", function()
{
    it("Test String Object", function() {

        const objectIn = "string";
        const objectOut = Utility.flattenObject(objectIn, "components");

        assert.deepEqual([objectIn], objectOut, "must be equal");
    });

    it("Test Array Object", function() {

        const objectIn = ["test1", "test2"];
        const objectOut = Utility.flattenObject(objectIn, "components");

        assert.deepEqual(objectIn, objectOut, "must be equal");
    });

    it("Test Object No Flat-On Property", function() {

        const objectIn = {"key1": "value1", "key2": "value2"};
        const objectOut = Utility.flattenObject(objectIn, "components");

        assert.deepEqual([objectIn], objectOut, "must be equal");
    });

    it("Test Object With Empty Flat-On Property", function() {

        const objectIn = {"key1": "value1", "key2": "value2", "components": [ ]};
        const objectOut = Utility.flattenObject(objectIn, "components");

        assert.deepEqual([], objectOut, "must be equal");
    });

    it("Test 1 Object, 1 level Flat-On Property", function() {

        const objectIn = {"key1": "value1", "key2": "value2", "components": [ { "key3": "value3"} ]};
        const objectOut = Utility.flattenObject(objectIn, "components");
        const expected = {"key1": "value1", "key2": "value2", "key3": "value3"};

        assert.deepEqual([expected], objectOut, "must be equal");
    });

    it("Test 2 Object, 1 level Flat-On Property", function() {

        const objectIn = {"key1": "value1", "key2": "value2", "components": [ { "key3": "value3"},  { "key4": "value4"} ]};
        const objectOut = Utility.flattenObject(objectIn, "components");
        const expected = [
            {"key1": "value1", "key2": "value2", "key3": "value3"},
            {"key1": "value1", "key2": "value2", "key4": "value4"}];

        assert.deepEqual(expected, objectOut, "must be equal");
    });

    it("Test 2 Object, 2 level Flat-On Property", function() {

        const objectIn = {"key1": "value1", "key2": "value2", "components": [
            {
                "key3": "value3",
                components: [
                    { "key4": "value4"},
                    { "key5": "value5"}
                ]
            }
        ]};

        const objectOut = Utility.flattenObject(objectIn, "components");
        const expected = [
            {"key1": "value1", "key2": "value2", "key3": "value3", "key4": "value4"},
            {"key1": "value1", "key2": "value2", "key3": "value3", "key5": "value5"}];

        assert.deepEqual(expected, objectOut, "must be equal");
    });

});