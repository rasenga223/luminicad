declare global {
    interface Window {
        // Geometry
        gp_Pnt: any;
        gp_Dir: any;
        gp_Vec: any;
        gp_Ax1: any;
        gp_Ax2: any;
        gp_Ax3: any;

        // Curves
        Geom_Line: any;
        Geom_Circle: any;
        Geom_BSplineCurve: any;

        // Surfaces
        Geom_Plane: any;
        Geom_CylindricalSurface: any;
        Geom_SphericalSurface: any;

        // Shapes
        TopoDS_Shape: any;
        TopoDS_Solid: any;
        TopoDS_Face: any;

        // Boolean Operations
        BRepPrimAPI_MakeCylinder: any;
        BRepPrimAPI_MakeBox: any;
        BRepPrimAPI_MakeSphere: any;
    }
}

export {};
