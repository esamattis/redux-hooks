import {useMapState} from "../src/redux-hooks";

test("foo", () => {
    function Foo() {
        useMapState(
            (state, a, b) => {
                a; // $ExpectType number
                b; // $ExpectType string
            },
            [1, ""],
        );
    }
});
