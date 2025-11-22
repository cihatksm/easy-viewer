declare namespace Express {
    interface Response {
        render: import('../lib/rooter').Rooter['render'];
    }
}
