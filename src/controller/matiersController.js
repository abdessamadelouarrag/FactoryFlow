import Material from "../models/Material.js"

export async function createMaterial(req, res, next){
    try{
        const {reference, name, unit} = req.body

        if(!reference || !name || !unit){
            return res.status(400).json({
                message_error : "obligation de tout les champs !"
            })
        }

        //deja la reference

        const fondReference = await Material.findOne({reference : reference});

        const upperReference = reference.toUpperCase();

        if(fondReference){
            return res.status(400).json({
                message_error : "Deja il ya une matier avec se refernce !"
            })
        }

        const createNewMaterial = await Material.create({
            reference : upperReference,
            name : name,
            unit : unit,
        })

        return res.status(201).json({
            message_creation : "vous avez créer une nouvelle materiel ...",
            info_Materiel : {
                reference : createNewMaterial.reference,
                name : createNewMaterial.name
            }
        })

    }catch(error){
        next(error)
    }
}

