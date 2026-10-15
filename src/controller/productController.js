import productRepository from "../repositories/productRepository.js";
import materialRepository from "../repositories/materialRepository.js";
import productionOrderRepository from "../repositories/productionOrderRepository.js";

async function verifyComposition(composition){
    if(!Array.isArray(composition) || composition.length === 0){
        return {status : 400, message_error : "La composition est obligatoire !"};
    }

    const compositionV = [];
    const materials = new Set();

    for(const line of composition){
        if(!line || typeof line.material !== "string" || !line.material.trim()){
            return {status : 400, message_error : "La matiere est obligatoire dans chaque ligne !"};
        }

        const quantity = line.quantityPerUnit;
        if((typeof quantity !== "number" && typeof quantity !== "string") ||
            !Number.isFinite(Number(quantity)) || Number(quantity) <= 0){
            return {status : 400, message_error : "La quantite par unite doit etre strictement positive !"};
        }

        const material = line.material.trim();
        const findMaterial = await materialRepository.findByIdentifier(material);

        if(!findMaterial){
            return {status : 404, message_error : "Matiere premiere introuvable !"};
        }

        const materialId = findMaterial._id.toString();
        if(materials.has(materialId)){
            return {status : 400, message_error : "La composition ne doit pas contenir de matieres en doublon !"};
        }

        materials.add(materialId);
        compositionV.push({material : findMaterial._id, quantityPerUnit : Number(quantity)});
    }

    return {composition : compositionV};
}

function productError(error, res, next){
    if(error.code === 11000){
        return res.status(409).json({message_error : "La reference du produit est deja utilisee !"});
    }

    if(error.name === "ValidationError" || error.name === "CastError"){
        return res.status(400).json({message_error : "Les informations du produit sont invalides !"});
    }

    return next(error);
}

export async function createProduct(req, res, next){
    try{
        const {reference, name, composition} = req.body || {};

        if(typeof reference !== "string" || !reference.trim() ||
            typeof name !== "string" || !name.trim()){
            return res.status(400).json({message_error : "Obligation de reference, name et composition !"});
        }

        const upperReference = reference.trim().toUpperCase();
        const findProduct = await productRepository.findByReference(upperReference);

        if(findProduct){
            return res.status(409).json({message_error : "La reference du produit est deja utilisee !"});
        }

        const compositionV = await verifyComposition(composition);
        if(compositionV.message_error){
            return res.status(compositionV.status).json({message_error : compositionV.message_error});
        }

        const createNewProduct = await productRepository.create({
            reference : upperReference,
            name : name.trim(),
            composition : compositionV.composition
        });

        return res.status(201).json({
            message_creation : "Vous avez cree un nouveau produit ...",
            info_product : createNewProduct
        });
    }catch(error){
        return productError(error, res, next);
    }
}

export async function allProduct(req, res, next){
    try{
        const products = await productRepository.findAll();

        return res.status(200).json({allProduct : products});
    }catch(error){
        next(error);
    }
}

export async function getProduct(req, res, next){
    try{
        const reference = req.params.reference.trim().toUpperCase();
        const findProduct = await productRepository.findDetailsByReference(reference);

        if(!findProduct){
            return res.status(404).json({message_error : "Produit introuvable !"});
        }

        return res.status(200).json({info_product : findProduct});
    }catch(error){
        next(error);
    }
}

export async function updateProduct(req, res, next){
    try{
        const reference = req.params.reference.trim().toUpperCase();
        const {name, composition} = req.body || {};

        if(typeof name !== "string" || !name.trim()){
            return res.status(400).json({message_error : "Obligation de name et composition !"});
        }

        const findProduct = await productRepository.findByReference(reference);
        if(!findProduct){
            return res.status(404).json({message_error : "Produit introuvable !"});
        }

        const compositionV = await verifyComposition(composition);
        if(compositionV.message_error){
            return res.status(compositionV.status).json({message_error : compositionV.message_error});
        }

        const updatedProduct = await productRepository.updateByReference(reference, {
            name : name.trim(), composition : compositionV.composition
        });

        if(!updatedProduct){
            return res.status(404).json({message_error : "Produit introuvable !"});
        }

        return res.status(200).json({
            message_update : "Vous avez modifie les informations du produit ...",
            info_product : updatedProduct
        });
    }catch(error){
        return productError(error, res, next);
    }
}

export async function deleteProduct(req, res, next){
    try{
        const reference = req.params.reference.trim().toUpperCase();
        const findProduct = await productRepository.findByReference(reference);

        if(!findProduct){
            return res.status(404).json({message_error : "Produit introuvable !"});
        }

        const findOrder = await productionOrderRepository.existsByProductId(findProduct._id);
        if(findOrder){
            return res.status(409).json({message_error : "Ce produit est utilise dans un ordre de production !"});
        }

        const deletedProduct = await productRepository.deleteByReference(reference);
        if(!deletedProduct){
            return res.status(404).json({message_error : "Produit introuvable !"});
        }

        return res.status(200).json({message_succes : "Produit supprime avec succes"});
    }catch(error){
        next(error);
    }
}
