import * as React from 'react';
import { autorpc } from '@malagu/core/lib/common/annotation/detached';
import { WelcomeServer } from '@app/welcome/lib/common';

interface Prop {}
interface State {
    response: string
}

export class App extends React.Component<Prop, State> {

    @autorpc(WelcomeServer)
    protected welcomeServer: WelcomeServer;

    constructor(prop: Prop) {
        super(prop);
        this.state = { response: 'Loading' };
    }

    async componentDidMount() {
        const response = await this.welcomeServer.say();
        this.setState({
            response
        });
    }

    render() {
        return <div>{this.state.response}</div>
    }
}