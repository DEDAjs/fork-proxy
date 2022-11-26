
const assert = require("assert");

const Utility = require("../src/Utility.js");

describe("Utility.replaceRefs", function()
{
    it("String - No References", function(){

        let str = "";
        assert.equal(Utility.replaceRefs(str, null), str, "Empty String");

        str = "This is a string";
        assert.equal(Utility.replaceRefs(str, null), str, "Long string");

    });

    it("String - Single Reference", function(){

        let object = {"value1": "value1"};

        let string = "${value1}";
        let result = "value1";
        assert.equal(Utility.replaceRefs(string, object), result, "Single value");

        string = "${value1} This is a string";
        result = "value1 This is a string";
        assert.equal(Utility.replaceRefs(string, object), result, "In the beginning");

        string = "This is ${value1} a string";
        result = "This is value1 a string";
        assert.equal(Utility.replaceRefs(string, object), result, "In the middle");

        string = "This is a string ${value1}";
        result = "This is a string value1";
        assert.equal(Utility.replaceRefs(string, object), result, "At the end");
    });

    it("String - Single Empty Reference", function(){

        let object = {"value1": "value1", "value2": ""};

        let string = "${value2}";
        let result = "";
        assert.equal(Utility.replaceRefs(string, object), result, "Single value");

        string = "${value2} This is a string";
        result = " This is a string";
        assert.equal(Utility.replaceRefs(string, object), result, "In the beginning");

        string = "This is ${value2} a string";
        result = "This is  a string";
        assert.equal(Utility.replaceRefs(string, object), result, "In the middle");

        string = "This is a string ${value2}";
        result = "This is a string ";
        assert.equal(Utility.replaceRefs(string, object), result, "At the end");
    });

    it("String - Multiple References", function(){

        let object = {"value1": "", "value2": "value3", "value3": "vvvvvaaaaalllllluuuuueeeee33333"};

        let string = "${object.value1} this is ${object.value2} a referenced value ${object.value3}";
        assert.equal(Utility.replaceRefs(string, {object}), eval("`" + string + "`"), "Increasing length");

        string = "${object.value3} this is ${object.value2} a referenced value ${object.value1}";
        assert.equal(Utility.replaceRefs(string, {object}), eval("`" + string + "`"), "Decreasing length");

        string = "${object.value2} this is ${object.value1} a referenced value ${object.value3}";
        assert.equal(Utility.replaceRefs(string, {object}), eval("`" + string + "`"), "Mixed length");

    });

    it("String - Missing References", function(){

        let object = {};

        let string = "${object.value1} this is a referenced value";
        assert.equal(Utility.replaceRefs(string, {object}), string, "Beginning");

        string = "this is a ${object.value1} referenced value";
        assert.equal(Utility.replaceRefs(string, {object}), string, "Middle");

        string = "this is a referenced value ${object.value1}";
        assert.equal(Utility.replaceRefs(string, {object}), string, "Middle");

        string = "${object.value1} this is ${object.value2} a referenced value ${object.value3}";
        assert.equal(Utility.replaceRefs(string, {object}), string, "Beginning middle end");

    });

    it("String - Typed References", function(){

        let object = {integer: 43, boolean: true, string: "STRING", float: 4.25};

        let string = "${object.integer} this ${object.boolean} is a ${object.string} referenced value ${object.float}";
        let result = Utility.replaceRefs(string, {object});
        assert.equal(result, eval("`" + string + "`"), "All types in a string");

    });

    it("String - Single Typed References", function(){

        let object = {integer: 43, boolean: true, string: "STRING", float: 4.25};

        let string = "${object.integer}";
        let result = Utility.replaceRefs(string, {object});
        assert.strictEqual(result, object.integer, "Integer");

        string = "${object.boolean}";
        result = Utility.replaceRefs(string, {object});
        assert.strictEqual(result, object.boolean, "Boolean");

        string = "${object.string}";
        result = Utility.replaceRefs(string, {object});
        assert.strictEqual(result, object.string, "String");

        string = "${object.float}";
        result = Utility.replaceRefs(string, {object});
        assert.strictEqual(result, object.float, "Float");
    });

    it("Object - Single Typed References", function(){

        let object = {integer: 43, boolean: true, string: "STRING", float: 4.25};

        let value = {integer: "${object.integer}" };
        let expected = {integer: object.integer };
        let result = Utility.replaceRefs(value, {object});
        assert.deepStrictEqual(result, expected, "Integer");

        value = {integer: "${object.integer}", boolean: "${object.boolean}", string: "${object.string}", float: "${object.float}" };
        expected = {integer: object.integer, boolean: object.boolean, string: object.string, float: object.float };
        result = Utility.replaceRefs(value, {object});
        assert.deepStrictEqual(result, expected, "All Types");
    });


    it("Array - Single Typed References", function(){

        let object = {integer: 43, boolean: true, string: "STRING", float: 4.25};

        let value = ["${object.integer}", "${object.boolean}", "${object.string}", "${object.float}", 1234, false, "another string", 5.557 ];
        let expected = [object.integer, object.boolean, object.string, object.float, 1234, false, "another string", 5.557  ];
        let result = Utility.replaceRefs(value, {object});
        assert.deepStrictEqual(result, expected, "All Types");
    });

});