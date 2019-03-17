/**
 * Shallow Equal check
 *
 * Adapted to TS from https://github.com/reduxjs/react-redux/blob/aba2452c8012336daaca666a3fda0f565a8f0cbc/src/utils/shallowEqual.js
 **/

/** Determines whether an object has a property with the specified name.  */
const hasOwn = Object.prototype.hasOwnProperty;

/**
 * Object.is() polyfill
 */
export function is(x: any, y: any) {
    if (x === y) {
        return x !== 0 || y !== 0 || 1 / x === 1 / y;
    } else {
        return x !== x && y !== y;
    }
}

export function shallowEqual(objA: any, objB: any) {
    if (is(objA, objB)) return true;

    if (
        typeof objA !== "object" ||
        objA === null ||
        typeof objB !== "object" ||
        objB === null
    ) {
        return false;
    }

    if (Array.isArray(objA) && Array.isArray(objB)) {
        if (objA.length !== objB.length) return false;

        for (let i = 0; i < objA.length; i++) {
            if (!is(objA[i], objB[i])) {
                return false;
            }
        }

        return true;
    }

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    for (let i = 0; i < keysA.length; i++) {
        if (
            !hasOwn.call(objB, keysA[i]) ||
            !is(objA[keysA[i]], objB[keysA[i]])
        ) {
            return false;
        }
    }

    return true;
}
