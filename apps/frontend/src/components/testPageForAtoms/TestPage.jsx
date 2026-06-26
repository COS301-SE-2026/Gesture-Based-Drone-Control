import { useState } from "react";
import { ThemeProvider } from "../../context/ThemeProvider";
import { AuthPanel, Button, Card, FormSection, Label, MetricValue, NavItem, StatusDot, Toggle } from "../atoms";
import { Home, BarChart3, Settings, Mail, Lock } from "lucide-react"

const TestPage = () => {
    const [email, setEmail] = useState('');
    const [toggle, setToggle] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);


    //this page serves as a test for all our atoms and is not used anywhere but purely for coverage purposes
    return (
        <ThemeProvider>
            <div className="p-8 space-y-8">
                {/* auth panel */}
                <AuthPanel title="Welcome" subtitle="sign in" />
                {/* button */}
                <div className="flex gap-2 flex-wrap">
                    <Button>Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button size="sm">small</Button>
                    <Button size="lg">large</Button>
                    <Button isLoading={loading} onClick={() => {
                        setLoading(true);
                        setTimeout(() => setLoading(false), 2000);
                    }}>Loading</Button>
                    <Button icon={Home}>Icon</Button>
                    <Button disabled>disabled</Button>
                </div>
                {/* card */}
                <div className="grid grid-cols-2 gap-4">
                    <Card variant="glass"><p>Glass card</p></Card>
                    <Card variant="dark"><p>dark card</p></Card>
                    <Card clickable><p>clickable card</p></Card>
                </div>
                {/* form section */}
                <div className="space-y-4 max-w-md">
                    <FormSection
                    label="Email"
                    name="email"
                    type="email"
                    placeholder="enter email"
                    icon={Mail}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    />
                    <FormSection
                    label="Password"
                    name="password"
                    type="password"
                    placeholder="enter password"
                    icon={Lock}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    />
                    <FormSection
                    label="Error"
                    name="error"
                    placeholder="error field"
                    value=""
                    onChange={() => {}}
                    error
                    errorMessage="field required"
                    />
                </div>
                {/* label */}
                <div className="space-y-2">
                    <Label> Xtra small</Label>
                    <Label size="sm">Small label</Label>
                </div>
                {/* metric val */}
                <div className="space-y-2">
                    <MetricValue value="42" unit="%" size="sm" />
                    <MetricValue value="6769" unit="ms" />
                    <MetricValue value="67" unit="mins" size="lg" />
                </div>
                {/* nav items */}
                <div className="space-y-2 max-w-xs">
                    <NavItem label="Home" Icon={Home} active />
                    <NavItem label="Analytics" Icon={BarChart3} active />
                    <NavItem label="Settings" Icon={Settings} active />
                </div>
                {/* status dot */}
                <div className="flex gap-4">
                    <StatusDot variant="connected" />
                    <StatusDot variant="disconnected" />
                    <StatusDot variant="warning" />
                    <StatusDot variant="idle" />
                    <StatusDot variant="connected" size="md"/>
                </div>
                {/* toggle */}
                <div className="flex gap-4 items-center">
                    <Toggle checked={toggle} onChange={setToggle} />
                    <span>{toggle ? 'ON' : 'OFF'}</span>
                    <Toggle disabled />
                </div>
            </div>
        </ThemeProvider>
    );
};

export default TestPage;