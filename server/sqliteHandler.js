const path = require('path');
const sqlite3 = require('sqlite3').verbose();


const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'mydb.sqlite');

class SQLiteHandler {
    constructor(dbPath) {
        this.dbPath = dbPath || DATABASE_PATH;
    }

    _getConnection() {
        try {
            return new sqlite3.Database(this.dbPath);
        } catch (err) {
            console.error(`Database connection error: ${err}`);
            return null;
        }
    }

    getLibraryForSound(soundName, table = 'Sounds') {
        return new Promise((resolve, reject) => {
            const db = this._getConnection();
            if (!db) return resolve(null);

            db.get(
                `SELECT Tags FROM ${table} WHERE Label = ?`,
                [soundName],
                (err, row) => {
                    db.close();
                    if (err) {
                        console.error(`Query error: ${err}`);
                        return resolve(null);
                    }
                    resolve(row ? row.Tags : null);
                }
            );
        });
    }

    getArticulations(soundName) {
        return new Promise((resolve, reject) => {
            const db = this._getConnection();
            if (!db) return resolve(null);

            db.get(
                `SELECT Articulations FROM Sounds WHERE Label = ?`,
                [soundName],
                (err, row) => {
                    db.close();
                    if (err) {
                        console.error(`Query error: ${err}`);
                        return resolve(null);
                    }
                    if (!row || !row.Articulations) return resolve(null);

                    // Split the newline separated values into a list of tuples
                    const articulations = row.Articulations.split('\n');
                    const splits = articulations.map(a => a.split(','));

                    const result = [];
                    for (const item of splits) {
                        if (item.length !== 2) {
                            continue;
                        }
                        const artName = item[0].trim();
                        let kw = item[1].trim();

                        let midiNumber;
                        if (/^\d+$/.test(kw)) {
                            midiNumber = parseInt(kw, 10);
                        } else {
                            // Convert note name (e.g., C1, D#2) to MIDI number
                            midiNumber = noteNameToMidi(kw);
                        }
                        result.push([artName, midiNumber]);
                    }
                    resolve(result);
                }
            );
        });
    }
}

// Helper: Convert note name (e.g., C1, D#2) to MIDI number
function noteNameToMidi(note) {
    // Basic implementation, covers C-1 (0) to G9 (127)
    const regex = /^([A-Ga-g])([#b]?)(-?\d+)$/;
    const match = note.match(regex);
    if (!match) return null;
    let [, n, accidental, octave] = match;
    n = n.toUpperCase();
    octave = parseInt(octave, 10);

    const noteBase = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    let midi = (octave + 1) * 12 + noteBase[n];
    if (accidental === '#') midi += 1;
    if (accidental === 'b') midi -= 1;
    return midi;
}

module.exports = { SQLiteHandler };

// Example usage (uncomment to test directly)
// const handler = new SQLiteHandler();
// handler.getLibraryForSound('Deep Space World Killer').then(console.log);
// handler.getArticulations('Deep Space World Killer').then(console.log);