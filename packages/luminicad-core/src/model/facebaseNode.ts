import { Property } from "../property";
import { Serializer } from "../serialize";
import { ParameterShapeNode } from "./shapeNode";

export abstract class FacebaseNode extends ParameterShapeNode {
    @Serializer.serialze()
    @Property.define("command.faceable.isFace")
    get isFace() {
        return this.getPrivateValue("isFace", false);
    }
    set isFace(value: boolean) {
        this.setProperty("isFace", value);
    }
}
