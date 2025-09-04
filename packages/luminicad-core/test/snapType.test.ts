import { ObjectSnapType } from "../src";

test("test SnapType", () => {
    let ts = ObjectSnapType.endPoint | ObjectSnapType.midPoint;
    expect(ObjectSnapType.has(ts, ObjectSnapType.center)).toBeFalsy();
    expect(ObjectSnapType.has(ts, ObjectSnapType.midPoint)).toBeTruthy();
});
