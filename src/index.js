const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const socketio = require('@feathersjs/socketio');
const moment = require('moment');
const path = require('path');
const tasks = require('./../config/tasks.json');
const {arrayContain} = require('./helpers/helpers');
// Creates an Express compatible Feathers application
const app = express(feathers());
const timeLimit = 60 * 45;
// Parse HTTP JSON bodies
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.configure(express.rest());



app.configure(socketio({

}, function(io) {
    io.on('connection', function(socket) {
       setInterval(() => {
           socket.emit('game_status', {
               teams,
               timeLimit
           });
       }, 1000)
    });
}));

//Variable to hold teams
let teams = {};
let interval = null;

app.use('/timer', express.static(path.join(__dirname, './timer')));
app.use('/terminal', express.static(path.join(__dirname, './terminal')));

/**
 * Used by the terminal
 */
app.get('/healthcheck', (req, res) => {
    if (req.headers['x-codebattle-team'] || req.query.teamId ) {
        const teamId = req.headers['x-codebattle-team'] || req.query.teamId;
        if (teams[teamId]) {
            const team = teams[teamId];
            const toShow = tasks.filter((task) => {
                return arrayContain(task.step, team.done) && task.visible === true;
            });
            return res.json({
                tasks: toShow.map(({error, link, name, result}) => ({error, link, name, result}))
            })

        }
        return res.json({
            err: 'No such team'
        })
    }
    return res.json({
        err: 'No header set'
    })

});

/**
 * Starts the game
 */
app.post('/start', (req, res) => {
    clearInterval(interval);
    interval = setInterval(() => {
        Object.keys(teams).forEach((teamIndex) => {
            const team = teams[teamIndex];
            if (!team.finished) {
                team.time++;
            }
            if(team.time >= timeLimit){
                team.finished = true;
            }
            teams[teamIndex] = team;
        });
    }, 1000);
    console.info(`${moment().format('LTS')} Game has been started. `);
    return res.json({
        teams
    })
});

/**
 * Set status of the team
 */
app.post('/status', (req, res) => {
    if (req.body.teamId && teams[req.body.teamId] && req.body.hasOwnProperty('stepId')) {
        const team = teams[req.body.teamId];
        const stepId = req.body.stepId;
        if (!team.done.includes(parseInt(stepId))) {
            team.done.push(parseInt(stepId));
            team.step = Math.max(...team.done);
            teams[req.body.teamId] = team;
            console.info(`${moment().format('LTS')} Team ${req.body.teamId} has finished E:${stepId}.`);
        }
        return res.json({
            team
        })
    }
    return res.json({
        err: 'No such team'
    })
});

/**
 * Get status of the team
 */
app.get('/status', (req, res) => {
    if (req.body.teamId && teams[req.body.teamId]) {
        const team = teams[req.body.teamId];
        return res.json({
            team
        })
    }
    return res.json({
        err: 'No such team'
    })
});

/**
 * Stop the game
 */
app.post('/stop', (req, res) => {
    console.info(`${moment().format('LTS')} Time has been stopped.`);

    clearInterval(interval);
    return res.json({
        teams
    })
});

/**
 * Clear all teams table
 */
app.post('/clear', (req, res) => {
    console.info(`${moment().format('LTS')} Teams have been cleared.`);
    clearInterval(interval);
    teams = {};
    return res.json({
        teams
    })
});

/**
 * Adding teams
 */
app.post('/teams', (req, res) => {

    const teamId = req.body.teamId;
    if (teamId) {
        const team = {
            time: 0,
            step: 0,
            done: [],
            teamId,
            finished: false
        };
        console.info(`${moment().format('LTS')} Team ${teamId} has been added`);
        teams[teamId] = (team);
        return res.json({
            teams,
            team
        });
    }
    return res.json({
        teams
    });
});

/**
 * Get teams list
 */
app.get('/teams', (req, res) => {
    return res.json({
        teams
    });
});

app.listen(3030).on('listening', () =>
    console.log('Feathers server listening on localhost:3030')
);