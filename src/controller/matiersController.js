import materialRepository from "../repositories/materialRepository.js";

export async function createMaterial(req, res, next){
    try{
        const {reference, name, unit} = req.body

        if(!reference || !name || !unit){
            return res.status(400).json({
                message_error : "obligation de tout les champs !"
            })
        }

        //deja la reference

        const fondReference = await materialRepository.findByReference(reference);

        const upperReference = reference.toUpperCase();

        if(fondReference){
            return res.status(400).json({
                message_error : "Deja il ya une matier avec se refernce !"
            })
        }

        const createNewMaterial = await materialRepository.create({
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

export async function allMaterial(req, res, next){
    try{
        const allMaterial = await materialRepository.findAll();

        return res.status(200).json({
            allMaterial : allMaterial
        })
    }catch(error){
        next(error);
    }
}

export async function updateMaterial(req, res, next) {
    try{
        const {reference} = req.params
        const {name, unit} = req.body

        if(!reference || !name || !unit){
            return res.status(400).json({
                message_error : "obliagation de reference !"
            })
        }

        const material = await materialRepository.findByReference(reference);

        if(!material){
            return res.status(400).json({
                message_error : "il ya aucun reference !"
            })
        }

        await materialRepository.updateByReference(reference, {name, unit});

        return res.status(200).json({
            message_update : "vous aves modifier les info de material...",
            info_Materiel : {
                reference : reference,
                name : name,
                unit : unit
            }
        })


    }catch(error){
        next(error);
    }
}
