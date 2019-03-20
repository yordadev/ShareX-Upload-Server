const path = require("path")
const formidable = require("formidable")
const fs = require("fs-extra")
const ejs = require("ejs")
async function paste(req, res) {
    res.setHeader("Content-Type", "text/text")
    let fileName = this.randomToken(5) // 916,132,832 possible file names
    let form = new formidable.IncomingForm()
    let protocol = this.protocol()
    form.parse(req, (err, fields, files) => {
        let userIP = req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress
        if (!this.auth(this.c.key, fields.key, this.c)) {
            res.statusCode = 401
            res.write("Unauthorized");
            res.end();
            return this.log.warning(`Unauthorized User | File Upload | ${userIP}`)
        }
        this.db.get("files")
            .push({
                path: `/${fileName}`,
                ip: userIP,
                views: 0
            })
            .write();
        let oldpath = files.fdata.path
        let newpath = `${__dirname}/../uploads/${fileName+files.fdata.name.toString().match(/(\.)+([a-zA-Z0-9]+)+/g, "").toString()}`;
        if (Math.round((files.fdata.size / 1024) / 1000) > this.c.paste.max_upload_size) {
            if (this.monitorChannel !== null) this.bot.createMessage(this.monitorChannel, `\`\`\`MARKDOWN\n[FAILED PASTE][USER]\n[FILE](${files.fdata.name})\n[SIZE](${Math.round(files.fdata.size/1024)}KB)\n[TYPE](${files.fdata.type})\n[IP](${userIP})\n\n[ERROR](ERR_FILE_TOO_BIG)\`\`\``)
            res.statusCode = 413
            res.write(`${protocol}://${req.headers.host}/ERR_FILE_TOO_BIG`)
            return res.end()
        } else {
            fs.move(oldpath, newpath, err => {
                fs.readFile(newpath, "utf-8", function read(err, data) {
                    let stream = fs.createWriteStream(`${__dirname}/../uploads/${fileName}.html`)
                    stream.once("open", fd => {
                        let cleaned = data.replace(/>/g, "&gt")
                        cleaned = cleaned.replace(/</g, "&lt")
                        ejs.renderFile(`${__dirname}/../views/paste.ejs`, {
                            ogDesc: data.match(/.{1,297}/g)[0],
                            pData: data
                        }, {}, (err, str) => {
                            stream.write(str)
                        })
                        stream.end()
                        fs.unlink(newpath, err => {
                            if (err) return
                        });
                        res.write(`${protocol}://${req.headers.host}/${fileName}`)
                        return res.end()
                    })
                })
            })
            if (this.monitorChannel !== null) this.bot.createMessage(this.monitorChannel, `\`\`\`MARKDOWN\n[NEW PASTE][USER]\n[SIZE](${Math.round(files.fdata.size/1024)}KB)\n[IP](${userIP})\n\`\`\`\n${protocol}://${req.headers.host}/${fileName}`)
        }
    })
}
module.exports = paste