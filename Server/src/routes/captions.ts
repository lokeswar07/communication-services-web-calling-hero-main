import * as express from 'express';
const router = express.Router();
type Dict<T> = { [key: string]: T };

const meetingCaptions: Dict<string[]> = {} ;

interface StoreCaptions {
  meetingId: string;
  userId: string;
  originalText: string,
  captions: string;
}

interface GetCaptions {
    meetingId: string;
}


router.post('/', async function storeCaptions(req, res, next) {
    const storeCaptionsParams: StoreCaptions = req.body;
    console.log(storeCaptionsParams);
    let text = storeCaptionsParams.originalText + " - " + storeCaptionsParams.captions;
    if(meetingCaptions[storeCaptionsParams.meetingId] && text !== " - "){
        meetingCaptions[storeCaptionsParams.meetingId.toString()].push(text);
    } else if (text !== " - ") {
        meetingCaptions[storeCaptionsParams.meetingId.toString()] = [text]
    }
    console.log(meetingCaptions);
    res.send(storeCaptionsParams);
})

router.get('/', async function getCaptions(req, res, next) {
    console.log(req.query.meetingId);
    const body:GetCaptions = req.body;
    let data:string[] = [];

    if(meetingCaptions[req.query.meetingId.toString()]){
        data = meetingCaptions[req.query.meetingId.toString()]
    }
    console.log("data", data);
    res.send(data);
})

export default router;