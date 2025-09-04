import { RibbonTab } from "luminicad-core";

export const DefaultRibbon: RibbonTab[] = [
    {
        tabName: "ribbon.tab.startup",
        groups: [
            {
                groupName: "ribbon.group.draw",
                items: [
                    "modify.move",
                    "modify.delete",
                    "create.line",
                    "create.arc",
                    "create.bezier",
                    "create.rect",
                    "create.circle",
                    "create.polygon",
                    "create.box",
                    "create.cylinder",
                    "create.pyramid",
                    "create.sphere",
                    "create.ellipse",
                    "create.cone",
                    "create.thickSolid",
                ],
            },
            {
                groupName: "ribbon.group.modify",
                items: [
                    "modify.rotate",
                    "modify.mirror",
                    "create.offset",
                    "modify.break",
                    "modify.trim",
                    "modify.chamfer",
                    "modify.fillet",
                    "modify.explode",
                ],
            },
            {
                groupName: "ribbon.group.boolean",
                items: ["boolean.fuse", "boolean.common", "boolean.cut"],
            },
            {
                groupName: "ribbon.group.converter",
                items: [
                    "convert.toFace",
                    "convert.toWire",
                    "convert.prism",
                    "convert.sweep",
                    "convert.revol",
                ],
            },
            {
                groupName: "ribbon.group.importExport",
                items: ["file.import", "file.export"],
            },

            /* Temporarily hidden workingPlane section
            {
                groupName: "ribbon.group.workingPlane",
                items: ["workingPlane.set", "workingPlane.alignToPlane"],
            },
            */
            /* Temporarily hidden tools section
            {
                groupName: "ribbon.group.tools",
                items: ["create.section", "modify.split"],
            },
            */
        ],
    },
    {
        tabName: "ribbon.tab.tools",
        groups: [
            {
                groupName: "ribbon.group.modify",
                items: [
                    "modify.move",
                    "modify.rotate",
                    "modify.mirror",
                    "create.offset",
                    "modify.break",
                    "modify.trim",
                    "modify.delete",
                    "modify.chamfer",
                    "modify.fillet",
                    "modify.explode",
                    "modify.removeSubShapes",
                ],
            },
            {
                groupName: "ribbon.group.boolean",
                items: ["boolean.fuse", "boolean.common", "boolean.cut"],
            },
            {
                groupName: "ribbon.group.converter",
                items: [
                    "convert.toFace",
                    "convert.toWire",
                    "convert.prism",
                    "convert.sweep",
                    "convert.revol",
                ],
            },
        ],
    },
    /* Temporarily hidden draw tab section
    {
        tabName: "ribbon.tab.draw",
        groups: [
            {
                groupName: "ribbon.group.draw",
                items: ["create.line", "create.rect", "create.circle", "create.box"],
            },
            {
                groupName: "ribbon.group.draw",
                items: ["test.performace", "create.rect", ["create.circle", "create.box"]],
            },
        ],
    },
    */
];
